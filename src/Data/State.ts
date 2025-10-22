import https from 'https';
import {NightscoutToken, State} from './NightscoutTypes.js';
import {NIGHTSCOUT_HOST} from './NightscoutConstants.js';
import {getSummaryErrorResponse} from './NightscoutUtils.js';
import {getValidToken} from './NightscoutAuth.js';

export async function getState(): Promise<State> {
    try {
        const token = await getValidToken();
        return getStateWithToken(token);
    } catch (error: any) {
        console.error(error.message);
        return getSummaryErrorResponse(error.message);
    }
}

function getStateWithToken(nightscoutToken: NightscoutToken): Promise<State> {
    return new Promise((resolve) => {
        const request_options = {
            host: NIGHTSCOUT_HOST,
            port: 443,
            path: '/api/v2/summary',
            headers: {
                'Authorization': 'Bearer ' + nightscoutToken.token
            }
        };

        https.get(request_options, (resp: any) => {
            if (resp.statusCode !== 200) {
                console.log('error response code' + resp.statusCode);
                resolve(getSummaryErrorResponse('Could not get summary. Code ' + resp.statusCode));
            }

            let summaryJson = '';
            // A chunk of data has been received.
            resp.on('data', (chunk: string) => {
                summaryJson += chunk;
            });

            resp.on('end', () => {
                try {
                    let summaryResponse = JSON.parse(summaryJson);

                    if (summaryResponse) {
                        const iob: number = summaryResponse.state.iob;
                        resolve({
                            error: '',
                            iob: iob
                        });
                    } else {
                        resolve(getSummaryErrorResponse('No summary data'));
                    }
                } catch (error: any) {
                    console.error("Error parsing device status: " + error.message);
                    resolve(getSummaryErrorResponse(error.message));
                }
            });
        }).on("error", (err: any) => {
            console.log("Error: " + err.message);
            resolve(getSummaryErrorResponse(err.message));
        });
    });
}
