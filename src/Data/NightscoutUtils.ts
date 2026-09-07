import {Ages, DeviceStatus, Entry, NightscoutData, State} from './NightscoutTypes.js';
import {
    ARROW_DOUBLE_DOWN,
    ARROW_DOUBLE_UP,
    ARROW_FLAT,
    ARROW_FORTYFIVE_DOWN,
    ARROW_FORTYFIVE_UP,
    ARROW_NONE,
    ARROW_SINGLE_DOWN,
    ARROW_SINGLE_UP,
    HOURS_PER_DAY,
    UNKNOWN_AGE
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
        battery: -1,
        isCharging: false
    };
}

export function getAgesErrorResponse(message: string): Ages {
    return {
        error: message,
        sensorHours: UNKNOWN_AGE,
        podHours: UNKNOWN_AGE
    };
}

/**
 * Splits an age into whole days and the hours left over, the same way Nightscout splits its own
 * days/hours fields -- '2d10h' rather than the '2.4d' a single unit would give.
 */
export function formatAge(hours: number): string {
    if (hours < 0) {
        return '?';
    }
    return Math.floor(hours / HOURS_PER_DAY) + 'd' + Math.floor(hours % HOURS_PER_DAY) + 'h';
}

/**
 * Whether a wearable is inside the last warningHours of its expected life -- or already past it,
 * since an overdue sensor or pod is exactly what the warning is for. Each wearable passes its own
 * window. An age that could not be determined does not warn: there is nothing to count down from.
 */
export function isExpiring(hours: number, lifetimeHours: number, warningHours: number): boolean {
    if (hours < 0) {
        return false;
    }
    return lifetimeHours - hours < warningHours;
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
        charging: false,
        alert: '',
        sensorAge: '?',
        podAge: '?',
        sensorExpiring: false,
        podExpiring: false
    };
}
