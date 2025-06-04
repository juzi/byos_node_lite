import * as path from "node:path";

export const SECRET_KEY = readEnvOrFail('SECRET_KEY');
export const PUBLIC_URL_ORIGIN = readEnvOrFail('PUBLIC_URL_ORIGIN');
export const SCREEN_URL = PUBLIC_URL_ORIGIN + '/image?secret_key=' + SECRET_KEY;
export const SERVER_PORT = 3000;
export const SERVER_HOST = '0.0.0.0';
export const REFRESH_RATE_SECONDS = 60;
export const TIMEZONE = 'Europe/Warsaw';
export const ASSETS_FOLDER = path.join(import.meta.dirname, '..', 'assets');
export const TEMPLATE_FOLDER = path.join(import.meta.dirname, '/', 'Template');
export const ALLOW_FIRMWARE_UPDATE = true;
export const BUTTON_2_CLICK_FUNCTION = 'sleep'; // https://help.usetrmnl.com/en/articles/9672080-special-functions
export const BYOS_ENABLED = false;
export const BYOS_DEVICE_MAC = mayReadEnv('BYOS_DEVICE_MAC');
export const BYOS_DEVICE_ACCESS_TOKEN = mayReadEnv('BYOS_DEVICE_ACCESS_TOKEN');
export const BYOS_PROXY = false;

function mayReadEnv(key: string): string | undefined {
    const value = process.env[key];
    if (value === undefined || value.length < 2) {
        return undefined;
    }
    return value;
}

function readEnvOrFail(key: string): string {
    const value = process.env[key];
    if (value === undefined) {
        throw new Error(`Environment variable "${key}" is not set`);
    }
    return value;
}

