import * as path from "node:path";

export const SECRET_KEY = readEnvOrFail('SECRET_KEY');
export const URL_ORIGIN = readEnvOrFail('URL_ORIGIN');
export const SERVER_PORT = 3000;
export const TIMEZONE = 'Europe/Warsaw';
export const ASSETS_FOLDER = path.join(import.meta.dirname, '..', 'assets');


function readEnvOrFail(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Environment variable "${key}" is not set`);
    }
    return value;
}

