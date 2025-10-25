import https from 'https';
import {DeviceStatus, NightscoutToken} from './NightscoutTypes.js';
import {NIGHTSCOUT_HOST} from './NightscoutConstants.js';
import {getStatusErrorResponse} from './NightscoutUtils.js';
import {getValidToken} from './NightscoutAuth.js';

export async function getDeviceStatus(): Promise<DeviceStatus> {
    try {
        const token = await getValidToken();
        return getDeviceStatusWithToken(token);
    } catch (error: any) {
        console.error(error.message);
        return getStatusErrorResponse(error.message);
    }
}

function getDeviceStatusWithToken(nightscoutToken: NightscoutToken): Promise<DeviceStatus> {
    return new Promise((resolve) => {
        const request_options = {
            host: NIGHTSCOUT_HOST,
            port: 443,
            path: '/api/v3/devicestatus?sort$desc=created_at&limit=1',
            headers: {
                'Authorization': 'Bearer ' + nightscoutToken.token
            }
        };

        https.get(request_options, (resp: any) => {
            if (resp.statusCode !== 200) {
                console.log('error response code' + resp.statusCode);
                resolve(getStatusErrorResponse('Could not get devicestatus. Code ' + resp.statusCode));
            }

            let statusJson = '';
            // A chunk of data has been received.
            resp.on('data', (chunk: string) => {
                statusJson += chunk;
            });

            resp.on('end', () => {
                try {
                    let statusResponse = JSON.parse(statusJson);
                    let statusValues = statusResponse.result;
                    if (statusValues) {
                        const battery = statusValues[0].uploaderBattery;
                        resolve({
                            error: '',
                            battery: battery,
                            isCharging: statusValues[0].isCharging
                        });
                    } else {
                        resolve(getStatusErrorResponse('No devicestatus data'));
                    }
                } catch (error: any) {
                    console.error("Error parsing device status: " + error.message);
                    resolve(getStatusErrorResponse(error.message));
                }
            });
        }).on("error", (err: any) => {
            console.log("Error: " + err.message);
            resolve(getStatusErrorResponse(err.message));
        });
    });
}
