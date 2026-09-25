import {DeviceStatus, NightscoutToken} from './NightscoutTypes.js';
import {getStatusErrorResponse} from './NightscoutUtils.js';
import {getValidToken} from './NightscoutAuth.js';
import {getNightscoutJson} from './NightscoutHttp.js';

export async function getDeviceStatus(): Promise<DeviceStatus> {
    try {
        const token = await getValidToken();
        return await getDeviceStatusWithToken(token);
    } catch (error: any) {
        console.error(error.message);
        return getStatusErrorResponse(error.message);
    }
}

async function getDeviceStatusWithToken(nightscoutToken: NightscoutToken): Promise<DeviceStatus> {
    const statusResponse = await getNightscoutJson('/api/v3/devicestatus?sort$desc=created_at&limit=1', 'devicestatus', {
        headers: {'Authorization': 'Bearer ' + nightscoutToken.token},
        reuseLastGoodResponse: true
    });

    const statusValues = statusResponse ? statusResponse.result : undefined;
    if (!statusValues || statusValues.length === 0) {
        return getStatusErrorResponse('No devicestatus data');
    }

    return {
        error: '',
        battery: statusValues[0].uploaderBattery,
        isCharging: statusValues[0].isCharging,
        reservoirUnits: getReservoirUnits(statusValues[0].pump)
    };
}

/**
 * The pump's own devicestatus.pump.reservoir, in units. Reported as a plain number by most drivers,
 * but Omnipod (via AndroidAPS) reports the string '50+' until the level drops low enough to read
 * precisely -- which is always well clear of where a low-insulin alarm would trigger. A value in
 * that shape does not parse to a finite number, and is treated the same as no reading at all rather
 * than guessed at, since a wrong guess here is worse than an honest "unknown".
 */
function getReservoirUnits(pump: any): number | null {
    const value = pump ? pump.reservoir : undefined;
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
