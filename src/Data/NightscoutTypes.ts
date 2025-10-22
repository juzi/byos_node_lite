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
    alert: string
}

export type DeviceStatus = {
    error: string;
    battery: number;
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
