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
        isCharging: statusValues[0].isCharging
    };
}
