import {NightscoutToken} from './NightscoutTypes.js';
import {getNightscoutJson} from './NightscoutHttp.js';

const nightscoutToken: NightscoutToken = {token: '', expirationDateTime: Date.now()};

export function getStoredToken(): NightscoutToken {
    return nightscoutToken;
}

export function isTokenValid(token: NightscoutToken): boolean {
    return !!token.token && !!token.expirationDateTime && token.expirationDateTime - 2000 > Date.now();
}

export async function refreshToken(): Promise<NightscoutToken> {
    // No reuse of a cached response here: a stale token is an expired token, and the caller
    // already keeps the valid one in memory.
    const jwtToken = await getNightscoutJson(
        '/api/v2/authorization/request/token=' + process.env['NIGHTSCOUT_API_SECRET'],
        'authorization token');

    if (!jwtToken || !jwtToken.token || !jwtToken.exp) {
        throw new Error('Could not get authorization token. No token in the response');
    }

    nightscoutToken.token = jwtToken.token;
    nightscoutToken.expirationDateTime = jwtToken.exp * 1000;
    return nightscoutToken;
}

export async function getValidToken(): Promise<NightscoutToken> {
    const token = getStoredToken();
    if (isTokenValid(token)) {
        return token;
    }
    return refreshToken();
}
