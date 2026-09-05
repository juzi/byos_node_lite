import dns from 'dns';
import https from 'https';
import {
    ADDRESS_FALLBACK_MAX_AGE_MS,
    NIGHTSCOUT_HOST,
    REQUEST_ATTEMPTS,
    REQUEST_TIMEOUT_MS,
    RESPONSE_FALLBACK_MAX_AGE_MS,
    RETRY_BASE_DELAY_MS
} from './NightscoutConstants.js';

// Errors that mean the network or the name service hiccuped rather than "this request is wrong".
// ENOTFOUND is in here on purpose: a resolver that is reachable but answers wrongly -- which is what
// happens while a VPN tunnel is coming up -- reports a permanent-looking NXDOMAIN for a name that exists.
const TRANSIENT_ERROR_CODES = ['EAI_AGAIN', 'ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
    'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE', 'ECONNABORTED'];

type CachedValue<T> = {
    value: T;
    timestamp: number;
}

export type GetOptions = {
    headers?: Record<string, string>;
    // Return the last good response for this path when every attempt failed, instead of throwing.
    reuseLastGoodResponse?: boolean;
}

// The last address each host resolved to, and the last body each path returned.
const cachedAddresses = new Map<string, CachedValue<dns.LookupAddress>>();
const cachedResponses = new Map<string, CachedValue<any>>();

class RequestError extends Error {
    readonly transient: boolean;

    constructor(message: string, transient: boolean) {
        super(message);
        this.transient = transient;
    }
}

/**
 * Drop-in replacement for the lookup that https uses internally: resolves through the system
 * resolver, remembers the address it got, and falls back to that address when a later lookup fails.
 * Keeps the display alive through the DNS outages that a VPN on the same host causes.
 */
export function lookupWithFallback(hostname: string,
                                   options: dns.LookupOptions,
                                   callback: (error: NodeJS.ErrnoException | null,
                                              address: string | dns.LookupAddress[],
                                              family?: number) => void): void {
    dns.lookup(hostname, {...options, all: true} as dns.LookupAllOptions, (error, addresses) => {
        if (!error && addresses.length > 0) {
            cachedAddresses.set(hostname, {value: addresses[0]!, timestamp: Date.now()});
            respondWithAddresses(callback, options, addresses);
            return;
        }

        const fallback = getFreshValue(cachedAddresses.get(hostname), ADDRESS_FALLBACK_MAX_AGE_MS);
        if (!fallback) {
            callback(error ?? new Error('No address found for ' + hostname), []);
            return;
        }

        console.warn('Could not resolve ' + hostname + ' (' + (error ? error.message : 'no address')
            + ') - falling back to cached address ' + fallback.address);
        respondWithAddresses(callback, options, [fallback]);
    });
}

/**
 * GETs a JSON document from Nightscout, retrying transient failures with an exponential backoff.
 * Rejects with the last error, unless reuseLastGoodResponse allows serving a recent cached body.
 */
export async function getNightscoutJson(path: string, description: string, options: GetOptions = {}): Promise<any> {
    let lastError: any;

    for (let attempt = 1; attempt <= REQUEST_ATTEMPTS; attempt++) {
        try {
            const value = await requestJson(path, description, options.headers ?? {});
            if (options.reuseLastGoodResponse) {
                cachedResponses.set(path, {value: value, timestamp: Date.now()});
            }
            return value;
        } catch (error: any) {
            lastError = error;
            if (!isTransient(error) || attempt === REQUEST_ATTEMPTS) {
                break;
            }
            const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
            console.warn(description + ': attempt ' + attempt + ' of ' + REQUEST_ATTEMPTS + ' failed ('
                + error.message + ') - retrying in ' + delayMs + 'ms');
            await delay(delayMs);
        }
    }

    if (options.reuseLastGoodResponse) {
        const fallback = getFreshValue(cachedResponses.get(path), RESPONSE_FALLBACK_MAX_AGE_MS);
        if (fallback !== undefined) {
            console.warn(description + ': all attempts failed (' + lastError.message
                + ') - reusing the last good response');
            return fallback;
        }
    }

    throw lastError;
}

// Only used by the tests, so one case cannot inherit the caches of another.
export function resetHttpCaches(): void {
    cachedAddresses.clear();
    cachedResponses.clear();
}

function requestJson(path: string, description: string, headers: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
        const request = https.get({
            host: NIGHTSCOUT_HOST,
            port: 443,
            path: path,
            headers: headers,
            lookup: lookupWithFallback,
            timeout: REQUEST_TIMEOUT_MS
        }, (response: any) => {
            if (response.statusCode !== 200) {
                response.resume();
                reject(new RequestError('Could not get ' + description + '. Code ' + response.statusCode,
                    response.statusCode >= 500 || response.statusCode === 429));
                return;
            }

            let body = '';
            response.on('data', (chunk: string) => body += chunk);
            response.on('error', (error: any) =>
                reject(new RequestError('Could not read ' + description + ': ' + error.message, true)));
            response.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (error: any) {
                    reject(new RequestError('Could not parse ' + description + ': ' + error.message, false));
                }
            });
        });

        request.on('timeout', () =>
            request.destroy(new RequestError('Could not get ' + description
                + '. No response within ' + REQUEST_TIMEOUT_MS + 'ms', true)));
        request.on('error', (error: any) =>
            reject(error instanceof RequestError ? error
                : new RequestError('Could not get ' + description + ': ' + error.message, isTransient(error))));
    });
}

function respondWithAddresses(callback: (error: NodeJS.ErrnoException | null,
                                         address: string | dns.LookupAddress[],
                                         family?: number) => void,
                              options: dns.LookupOptions,
                              addresses: dns.LookupAddress[]): void {
    if (options.all) {
        callback(null, addresses);
        return;
    }
    callback(null, addresses[0]!.address, addresses[0]!.family);
}

function isTransient(error: any): boolean {
    if (error instanceof RequestError) {
        return error.transient;
    }
    return !!error && TRANSIENT_ERROR_CODES.includes(error.code);
}

function getFreshValue<T>(cached: CachedValue<T> | undefined, maxAgeMs: number): T | undefined {
    if (!cached || Date.now() - cached.timestamp > maxAgeMs) {
        return undefined;
    }
    return cached.value;
}

function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
