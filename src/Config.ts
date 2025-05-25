import * as path from "node:path";

export const SECRET_KEY = readEnvOrFail('SECRET_KEY');
export const PUBLIC_URL_ORIGIN = readEnvOrFail('PUBLIC_URL_ORIGIN');
export const SERVER_PORT = 3000;
export const SERVER_HOST = '127.0.0.1'; // use '0.0.0.0' for access via local router
export const TIMEZONE = 'Europe/Warsaw';
export const ASSETS_FOLDER = path.join(import.meta.dirname, '..', 'assets');
export const BYOS_DEVICE_MAC = process.env['BYOS_DEVICE_MAC'] && process.env['BYOS_DEVICE_MAC'].length > 5 ? process.env['BYOS_DEVICE_MAC'] : undefined;

function readEnvOrFail(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Environment variable "${key}" is not set`);
    }
    return value;
}

