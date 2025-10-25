import https from 'https';
import smoothen from "./smoothing.js";
import {refreshRate} from "../BYOS/Display.js";
import {Entry, NightscoutData, NightscoutToken} from './NightscoutTypes.js';
import {ELECTRIC_PLUG, NIGHTSCOUT_HOST, PLUS_MINUS, REFRESH_SECONDS} from './NightscoutConstants.js';
import {getValidToken} from './NightscoutAuth.js';
import {getErrorResponse, getTrendArrowSymbol} from './NightscoutUtils.js';
import {getDeviceStatus} from './DeviceStatus.js';
import {getState} from './State.js';

// Re-export types for backward compatibility
export type {NightscoutData, NightscoutToken, Entry, DeviceStatus, State} from './NightscoutTypes.js';

// Re-export functions for backward compatibility
export {getDeviceStatus} from './DeviceStatus.js';
export {getState} from './State.js';

export async function getNightscoutData(): Promise<NightscoutData> {
    try {
        const token = await getValidToken();
        return getLatestValues(token);
    } catch (error: any) {
        console.error(error.message);
        return getErrorResponse(error.message);
    }
}


function getLatestValues(nightscoutToken: NightscoutToken): Promise<NightscoutData> {
    return new Promise((resolve) => {
        const request_options = {
            host: NIGHTSCOUT_HOST,
            port: 443,
            path: '/api/v3/entries?sort$desc=date&limit=20',
            headers: {
                'Authorization': 'Bearer ' + nightscoutToken.token
            }
        };
        https.get(request_options, (resp: any) => {
            if (resp.statusCode !== 200) {
                resolve(getErrorResponse('Could not get entries. Code ' + resp.statusCode));
                return;
            }

            let entriesJson = '';
            // A chunk of data has been received.
            resp.on('data', (chunk: string) => {
                entriesJson += chunk;
            });

            // The whole response has been received. Parse the body as JSON.
            resp.on('end', () => {
                try {
                    let entriesResponse = JSON.parse(entriesJson);
                    let entries = entriesResponse.result;
                    let data: Entry[] = []
                    entries.forEach((entry: any) =>
                        data.push({value: entry.sgv, timestamp: entry.date, smoothed: entry.sgv}));
                    let smoothedEntries: Entry[] = smoothen(data);

                    if (smoothedEntries && smoothedEntries.length > 1) {
                        const now: number = Date.now();
                        const age: number = (now - smoothedEntries[0].timestamp) / 1000;
                        const ageMinutes: number = Math.floor(age / 60);
                        const glucoseValue: number = smoothedEntries[0].smoothed;
                        const delta: number = Math.floor(glucoseValue - smoothedEntries[1].smoothed);
                        const sign: string = delta > 0 ? '+' : delta < 0 ? '-' : PLUS_MINUS;
                        const absoluteDelta: number = Math.abs(delta);
                        const arrow: string = getTrendArrowSymbol(smoothedEntries[0], smoothedEntries[1]);

                        let refreshSeconds: number = REFRESH_SECONDS

                        if ((smoothedEntries[0].timestamp + 300000 - now) < 60000) {
                            refreshSeconds = Math.ceil((smoothedEntries[0].timestamp + 300000 - now) / 1000) + 5;
                            if (refreshSeconds < 0) {
                                refreshSeconds = 5;
                            }
                        }
                        refreshRate.seconds = refreshSeconds;

                        getState().then((state) => {
                            getDeviceStatus().then((deviceStatus) => {
                                const battery: string = deviceStatus.error ? '' : deviceStatus.battery.toString();
                                const isCharging: string = deviceStatus.isCharging ? ELECTRIC_PLUG : '';
                                const alert: string = (deviceStatus.battery < 15) ? 'alert' : '';
                                const iob: string = state.error ? '?' : (Math.round(state.iob * 100) / 100).toFixed(2);
                                resolve({
                                    error: '',
                                    sugar: glucoseValue,
                                    arrow: arrow,
                                    age: ageMinutes,
                                    sign: sign,
                                    delta: absoluteDelta,
                                    rawEntries: JSON.stringify(smoothedEntries),
                                    iob: iob,
                                    battery: battery,
                                    charging: isCharging,
                                    alert: alert
                                });
                            });
                        });
                    } else {
                        resolve(getErrorResponse('Not enough data'));
                    }
                } catch (error: any) {
                    console.error("Error parsing entries: " + error.message);
                    resolve(getErrorResponse(error.message));
                }
            });

        }).on("error", (err: any) => {
            console.log("Error: " + err.message);
            resolve(getErrorResponse(err.message));
        });
    });
}
