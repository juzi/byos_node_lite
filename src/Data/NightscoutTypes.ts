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
    podAge: string
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
