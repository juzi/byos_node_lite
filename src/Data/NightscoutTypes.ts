export type NightscoutToken = {
    token: string;
    expirationDateTime: number;
}

export type NightscoutData = {
    error: string;
    sugar: number,
    arrow: string,
    age: number,
    sign: string,
    delta: number,
    rawEntries: string,
    iob: string,
    battery: string,
    charging: boolean,
    alert: string,
    sensorAge: string,
    podAge: string,
    // The same two ages unrounded, kept alongside the formatted strings so a consumer that wants to
    // count down to the next change does not have to parse '2d10h' back apart. UNKNOWN_AGE when
    // Nightscout had no treatment to derive one from.
    sensorHours: number,
    podHours: number,
    sensorExpiring: boolean,
    podExpiring: boolean,
    // Insulin remaining in the pod's reservoir, in units, straight from the pump's own devicestatus
    // report. null when Nightscout has no pump status yet, or when the driver has only reported a
    // non-numeric reading -- Omnipod, for one, reports '50+' until the level is low enough to read
    // precisely, which is always well above where the low-insulin alarm lives.
    podInsulinUnits: number | null
}

export type Ages = {
    error: string;
    // Fractional hours since the last sensor change and the last pod change, UNKNOWN_AGE when
    // Nightscout has no treatment to derive one from.
    sensorHours: number;
    podHours: number;
}

export type DeviceStatus = {
    error: string;
    battery: number;
    isCharging: boolean;
    // See NightscoutData.podInsulinUnits -- this is where it comes from.
    reservoirUnits: number | null;
}

export type Entry = {
    value: number;
    timestamp: number;
    smoothed: number;
}

export type State = {
    error: string;
    iob: number;
}
