import {beforeEach, expect, test, vi} from "vitest";
import {EventEmitter} from "node:events";
import {PassThrough} from "node:stream";

type Reply = {
    error?: any;
    statusCode?: number;
    body?: string;
}

// Replies the mocked https/dns hand out, one per call, in order. The queues are shared, so the
// cases run sequentially -- vitest.config.ts switches concurrent mode on for the whole project.
const httpsReplies: Reply[] = [];
const lookupReplies: any[] = [];
let httpsCalls = 0;

vi.mock('https', () => ({
    default: {
        get: (_options: any, callback: (response: any) => void) => {
            httpsCalls++;
            const request: any = new EventEmitter();
            request.destroy = (error: any) => request.emit('error', error);

            const reply: Reply = httpsReplies.shift() ?? {error: dnsError('EAI_AGAIN')};
            setTimeout(() => {
                if (reply.error) {
                    request.emit('error', reply.error);
                    return;
                }
                const response: any = new PassThrough();
                response.statusCode = reply.statusCode ?? 200;
                callback(response);
                response.end(reply.body ?? '');
            }, 0);

            return request;
        }
    }
}));

vi.mock('dns', () => ({
    default: {
        lookup: (_hostname: string, _options: any, callback: (error: any, addresses: any) => void) => {
            const reply = lookupReplies.shift();
            setTimeout(() => {
                if (reply instanceof Error) {
                    callback(reply, []);
                    return;
                }
                callback(null, [{address: reply, family: 4}]);
            }, 0);
        }
    }
}));

const {getNightscoutJson, lookupWithFallback, resetHttpCaches} = await import('./NightscoutHttp.js');

beforeEach(() => {
    httpsReplies.length = 0;
    lookupReplies.length = 0;
    httpsCalls = 0;
    resetHttpCaches();
});

test.sequential('retries a transient DNS failure and returns the answer of a later attempt', async () => {
    httpsReplies.push({error: dnsError('EAI_AGAIN')}, {body: '{"result": [1]}'});

    const json = await getNightscoutJson('/entries', 'entries');

    expect(json.result).toEqual([1]);
    expect(httpsCalls).toBe(2);
});

test.sequential('gives up after the configured number of attempts', async () => {
    httpsReplies.push({error: dnsError('ENOTFOUND')}, {error: dnsError('ENOTFOUND')}, {error: dnsError('ENOTFOUND')});

    await expect(getNightscoutJson('/entries', 'entries')).rejects.toThrow('ENOTFOUND');
    expect(httpsCalls).toBe(3);
});

test.sequential('does not retry a client error', async () => {
    httpsReplies.push({statusCode: 401});

    await expect(getNightscoutJson('/entries', 'entries')).rejects.toThrow('Could not get entries. Code 401');
    expect(httpsCalls).toBe(1);
});

test.sequential('reuses the last good response when every attempt failed', async () => {
    httpsReplies.push({body: '{"result": [42]}'});
    const fresh = await getNightscoutJson('/entries', 'entries', {reuseLastGoodResponse: true});
    expect(fresh.result).toEqual([42]);

    httpsReplies.push({error: dnsError('EAI_AGAIN')}, {error: dnsError('EAI_AGAIN')}, {error: dnsError('EAI_AGAIN')});
    const cached = await getNightscoutJson('/entries', 'entries', {reuseLastGoodResponse: true});

    expect(cached.result).toEqual([42]);
    expect(httpsCalls).toBe(4);
});

test.sequential('throws when there is nothing cached to fall back to', async () => {
    httpsReplies.push({error: dnsError('EAI_AGAIN')}, {error: dnsError('EAI_AGAIN')}, {error: dnsError('EAI_AGAIN')});

    await expect(getNightscoutJson('/entries', 'entries', {reuseLastGoodResponse: true})).rejects.toThrow('EAI_AGAIN');
});

test.sequential('falls back to the last resolved address when a lookup fails', async () => {
    lookupReplies.push('10.0.0.1', dnsError('EAI_AGAIN'));

    expect(await lookup({})).toEqual({address: '10.0.0.1', family: 4});
    expect(await lookup({})).toEqual({address: '10.0.0.1', family: 4});
});

test.sequential('reports the lookup error when no address was ever resolved', async () => {
    lookupReplies.push(dnsError('EAI_AGAIN'));

    await expect(lookup({})).rejects.toThrow('EAI_AGAIN');
});

test.sequential('answers in the shape the caller asked for', async () => {
    lookupReplies.push('10.0.0.2');

    expect(await lookup({all: true})).toEqual([{address: '10.0.0.2', family: 4}]);
});

function lookup(options: any): Promise<any> {
    return new Promise((resolve, reject) => {
        lookupWithFallback('nightscout.test', options, (error: any, address: any, family?: number) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(options.all ? address : {address: address, family: family});
        });
    });
}

function dnsError(code: string): NodeJS.ErrnoException {
    const error: NodeJS.ErrnoException = new Error(code + ' nightscout.test');
    error.code = code;
    return error;
}
