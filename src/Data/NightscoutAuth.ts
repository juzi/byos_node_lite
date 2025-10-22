import https from 'https';
import {NightscoutToken} from './NightscoutTypes.js';
import {NIGHTSCOUT_HOST} from './NightscoutConstants.js';

const nightscoutToken: NightscoutToken = {token: '', expirationDateTime: Date.now()};

export function getStoredToken(): NightscoutToken {
    return nightscoutToken;
}

export function isTokenValid(token: NightscoutToken): boolean {
    return !!token.token && !!token.expirationDateTime && token.expirationDateTime - 2000 > Date.now();
}

export async function refreshToken(): Promise<NightscoutToken> {
    return new Promise((resolve, reject) => {
        https.get('https://' + NIGHTSCOUT_HOST + '/api/v2/authorization/request/token=' + process.env['NIGHTSCOUT_API_SECRET'],
            (tokenResponse: any) => {
                if (tokenResponse.statusCode === 200) {
                    let jwtBody = "";

                    tokenResponse.on("data", (chunk: string) => {
                        jwtBody += chunk;
                    });

                    tokenResponse.on("end", () => {
                        try {
                            const jwtToken = JSON.parse(jwtBody);
                            const token = jwtToken.token;
                            const expirationDateTime = jwtToken.exp * 1000;
                            nightscoutToken.token = token;
                            nightscoutToken.expirationDateTime = expirationDateTime;
                            resolve(nightscoutToken);
                        } catch (error: any) {
                            console.error(error.message);
                            reject(error);
                        }
                    });
                } else {
                    reject(new Error('Could not get authorization token. Got ' + tokenResponse.statusCode));
                }
            }).on("error", (err: any) => {
            console.error("Error retrieving Nightscout token: " + err.message);
            reject(err);
        });
    });
}

export async function getValidToken(): Promise<NightscoutToken> {
    const token = getStoredToken();
    if (isTokenValid(token)) {
        return token;
    }
    return refreshToken();
}
