import smoothen from "./smoothing.js";
import {refreshRate} from "../BYOS/Display.js";
import {Entry, NightscoutData, NightscoutToken} from './NightscoutTypes.js';
import {PLUS_MINUS, REFRESH_SECONDS} from './NightscoutConstants.js';
import {getValidToken} from './NightscoutAuth.js';
import {getErrorResponse, getTrendArrowSymbol} from './NightscoutUtils.js';
import {getNightscoutJson} from './NightscoutHttp.js';
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
        return await getLatestValues(token);
    } catch (error: any) {
        console.error(error.message);
        return getErrorResponse(error.message);
    }
}

async function getLatestValues(nightscoutToken: NightscoutToken): Promise<NightscoutData> {
    const entriesResponse = await getNightscoutJson('/api/v3/entries?sort$desc=date&limit=20', 'entries', {
        headers: {'Authorization': 'Bearer ' + nightscoutToken.token},
        reuseLastGoodResponse: true
    });

    const entries = entriesResponse ? entriesResponse.result : undefined;
    if (!entries) {
        return getErrorResponse('Not enough data');
    }

    let data: Entry[] = []
    entries.forEach((entry: any) =>
        data.push({value: entry.sgv, timestamp: entry.date, smoothed: entry.sgv}));
    let smoothedEntries: Entry[] = smoothen(data);

    if (!smoothedEntries || smoothedEntries.length <= 1) {
        return getErrorResponse('Not enough data');
    }

    // Reused entries carry their original timestamps, so a stale reading shows up as an old one
    // on the display rather than as a fresh value.
    const now: number = Date.now();
    const age: number = (now - smoothedEntries[0]!.timestamp) / 1000;
    const ageMinutes: number = Math.floor(age / 60);
    const glucoseValue: number = smoothedEntries[0]!.smoothed;
    const delta: number = Math.floor(glucoseValue - smoothedEntries[1]!.smoothed);
    const sign: string = delta > 0 ? '+' : delta < 0 ? '-' : PLUS_MINUS;
    const absoluteDelta: number = Math.abs(delta);
    const arrow: string = getTrendArrowSymbol(smoothedEntries[0]!, smoothedEntries[1]!);

    let refreshSeconds: number = REFRESH_SECONDS

    if ((smoothedEntries[0]!.timestamp + 300000 - now) < 60000) {
        refreshSeconds = Math.ceil((smoothedEntries[0]!.timestamp + 300000 - now) / 1000) + 5;
        if (refreshSeconds < 0) {
            refreshSeconds = 5;
        }
    }
    refreshRate.seconds = refreshSeconds;

    const [state, deviceStatus] = await Promise.all([getState(), getDeviceStatus()]);
    const battery: string = deviceStatus.error ? '' : deviceStatus.battery.toString();
    const isCharging: boolean = deviceStatus.isCharging;
    const alert: string = (deviceStatus.battery < 15) ? 'alert' : '';
    const iob: string = state.error ? '?' : (Math.round(state.iob * 100) / 100).toFixed(2);

    return {
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
    };
}
