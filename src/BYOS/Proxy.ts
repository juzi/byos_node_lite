import {SetupResponse} from "./Setup.js";
import {DisplayResponse} from "./Display.js";

export async function proxySetup(macId: string): Promise<SetupResponse | null> {
    return requestCore('GET', '/api/setup', {id: macId});
}

export async function proxyDisplay(headers: { [key: string]: string | string[] }): Promise<DisplayResponse | null> {
    delete headers['host'];
    return requestCore('GET', '/api/display', headers);
}

export async function proxyLog(macId: string, accessToken: string, body: {
    [key: string]: any
}) {
    return requestCore('POST', '/api/log', {
        id: macId,
        'access-token': accessToken
    }, body);
}

async function requestCore(
    method: string,
    path: string,
    headers: { [key: string]: string | string[] },
    body?: {
        [key: string]: any
    }) {
    const response = await fetch('https://usetrmnl.com' + path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...headers,
        },
        body: body ? JSON.stringify(body) : null,
    });
    if (!response.ok) {
        console.error(`[PROXY] ${path} failed: ` + await response.text());
        return null;
    }
    const resultText = await response.text();
    return resultText === '' ? {} : JSON.parse(resultText);
}