import {Entry, NightscoutData, DeviceStatus, State} from './NightscoutTypes.js';
import {
    ARROW_NONE,
    ARROW_DOUBLE_DOWN,
    ARROW_SINGLE_DOWN,
    ARROW_FORTYFIVE_DOWN,
    ARROW_FLAT,
    ARROW_FORTYFIVE_UP,
    ARROW_SINGLE_UP,
    ARROW_DOUBLE_UP
} from './NightscoutConstants.js';

export function getTrendArrowSymbol(current: Entry, previous: Entry): string {
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

export function getStatusErrorResponse(message: string): DeviceStatus {
    return {
        error: message,
        battery: -1
    };
}

export function getSummaryErrorResponse(message: string): State {
    return {
        error: message,
        iob: 0
    };
}

export function getErrorResponse(message: string): NightscoutData {
    return {
        error: message,
        sugar: 0,
        arrow: ARROW_NONE,
        age: 0,
        sign: '',
        delta: 0,
        rawEntries: '',
        iob: '',
        battery: '',
        alert: ''
    };
}
