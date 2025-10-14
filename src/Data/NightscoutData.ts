import https from 'https';
import smoothen from "./smoothing.js";
import {refreshRate} from "../BYOS/Display.js";

const NIGHTSCOUT_HOST = 'nightscout.zimmercarral.net';

const REFRESH_SECONDS = 60;
const PLUS_MINUS = '\u00b1'; // Plus-Minus sign
const ARROW_FLAT = '\u2192';
const ARROW_FORTYFIVE_UP = '\u2197';
const ARROW_FORTYFIVE_DOWN = '\u2198';
const ARROW_SINGLE_UP = '\u2191';
const ARROW_SINGLE_DOWN = '\u2193';
const ARROW_DOUBLE_UP = '\u21c8';
const ARROW_DOUBLE_DOWN = '\u21ca';
const BATTERY_FULL = '\u{1F50B}';// battery symbol U+1F50B
const ARROW_NONE = '??';

export type NightscoutData = {
    error: string;
    sugar: number,
    arrow: string,
    age: number,
    sign: string,
    delta: number,
    rawEntries: string,
    battery: string
}

export type DeviceStatus = {
    error: string;
    battery: number;
}

export type NightscoutToken = {
    token: string;
    expirationDateTime: number;
}
export type Entry = {
    value: number;
    timestamp: number;
    smoothed: number;
}

const nightscoutToken: NightscoutToken = {token: '', expirationDateTime: Date.now()};

export async function getNightscoutData(): Promise<NightscoutData> {
    // If we have a valid auth token, use it. Usually, tokens from Nightscout are valid for 8 hours.
    if (nightscoutToken.token
        && nightscoutToken.expirationDateTime && nightscoutToken.expirationDateTime - 1000 > Date.now()) {
        return getLatestValues(nightscoutToken);
    }

    // otherwise retrieve a new token and use that.
    return new Promise((resolve) => {
        https.get('https://' + NIGHTSCOUT_HOST + '/api/v2/authorization/request/token=' + process.env['NIGHTSCOUT_API_SECRET'],
            (tokenResponse: any) => {
                if (tokenResponse.statusCode === 200) {
                    let jwtBody = "";

                    tokenResponse.on("data", (chunk: string) => {
                        jwtBody += chunk;
                    });

                    tokenResponse.on("end", async () => {
                        try {
                            const jwtToken = JSON.parse(jwtBody);
                            const token = jwtToken.token;
                            const expirationDateTime = jwtToken.exp * 1000;
                            nightscoutToken.token = token;
                            nightscoutToken.expirationDateTime = expirationDateTime;

                            const result = await getLatestValues(nightscoutToken);
                            resolve(result);
                        } catch (error: any) {
                            console.error(error.message);
                            resolve(getErrorResponse(error.message));
                        }
                    });
                } else {
                    resolve(getErrorResponse('Could not get authorization token. Got ' + tokenResponse.statusCode));
                }
            }).on("error", (err: any) => {
            console.error("Error retrieving Nightscout token: " + err.message);
            resolve(getErrorResponse(err.message));
        });
    });
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
                    let smootheddata: Entry[] = smoothen(data);

                    if (smootheddata && smootheddata.length > 1) {
                        const now: number = Date.now();
                        const age: number = (now - smootheddata[0].timestamp) / 1000;
                        const ageMinutes: number = Math.floor(age / 60);
                        const sugar: number = smootheddata[0].smoothed;
                        const delta: number = Math.floor(sugar - smootheddata[1].smoothed);
                        const sign: string = delta > 0 ? '+' : delta < 0 ? '-' : PLUS_MINUS;
                        const absoluteDelta: number = Math.abs(delta);
                        const arrow: string = getTrendArrowSymbol(smootheddata[0], smootheddata[1]);

                        let refresh_seconds: number = REFRESH_SECONDS

                        if ((smootheddata[0].timestamp + 300000 - now) < 60000) {
                            refresh_seconds = Math.ceil((smootheddata[0].timestamp + 300000 - now) / 1000) + 5;
                            if (refresh_seconds < 0) {
                                refresh_seconds = 5;
                            }
                            refreshRate.seconds = refresh_seconds;
                        } else {
                            refreshRate.seconds = REFRESH_SECONDS;
                        }
                        console.log('getting status');
                        getDeviceStatus(nightscoutToken).then((deviceStatus: DeviceStatus) => {

                            const battery: string = deviceStatus.error ? '' : BATTERY_FULL + " " + deviceStatus.battery + "%";

                            resolve({
                                error: '',
                                sugar: sugar,
                                arrow: arrow,
                                age: ageMinutes,
                                sign: sign,
                                delta: absoluteDelta,
                                rawEntries: JSON.stringify(smootheddata),
                                battery: battery
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

function getDeviceStatus(nightscoutToken: NightscoutToken): Promise<DeviceStatus> {
    return new Promise((resolve) => {
        const request_options = {
            host: NIGHTSCOUT_HOST,
            port: 443,
            path: '/api/v3/devicestatus?sort$desc=created_at&limit=1',
            headers: {
                'Authorization': 'Bearer ' + nightscoutToken.token
            }
        };
        console.log('blah');
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
                            battery: battery
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

function getTrendArrowSymbol(current: Entry, previous: Entry) {
    const slope = current.timestamp === previous.timestamp ? 0.0 :
        (previous.smoothed - current.smoothed) / (previous.timestamp - current.timestamp);

    const slopeByMinute = slope * 60000;

    if (slopeByMinute <= -3.5) return ARROW_DOUBLE_DOWN;
    if (slopeByMinute <= -2) return ARROW_SINGLE_DOWN;
    if (slopeByMinute <= -1) return ARROW_FORTYFIVE_DOWN;
    if (slopeByMinute <= 1) return ARROW_FLAT;
    if (slopeByMinute <= 2) return ARROW_FORTYFIVE_UP;
    if (slopeByMinute <= 3.5) return ARROW_SINGLE_UP;
    if (slopeByMinute <= 40) return ARROW_DOUBLE_UP;
    return ARROW_NONE;
}

function getStatusErrorResponse(message: string): DeviceStatus {
    return {
        error: message,
        battery: -1
    };
}

function getErrorResponse(message: string): NightscoutData {
    return {
        error: message,
        sugar: 0,
        arrow: ARROW_NONE,
        age: 0,
        sign: '',
        delta: 0,
        rawEntries: '',
        battery: ''
    };
}

