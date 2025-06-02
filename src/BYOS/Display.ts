import {
    ALLOW_FIRMWARE_UPDATE,
    BUTTON_2_CLICK_FUNCTION,
    BYOS_DEVICE_ACCESS_TOKEN,
    BYOS_PROXY,
    REFRESH_RATE_SECONDS,
} from "../Config.js";
import {proxyDisplay} from "./Proxy.js";
import {screenUrlAndHash} from "../Screen/Screen.js";
import {updateBattery} from "./Battery.js";
import {IncomingHttpHeaders} from "http";

export type DisplayResponse = {
    status: number,
    image_url: string | null, // in case of refresh firmware response
    filename: string | null, // name of image
    refresh_rate: number,
    reset_firmware: boolean,
    update_firmware: boolean,
    firmware_url: string,
    special_function: string,
}

let displayFromProxy = true; // one by one

export async function displayRoute(macId: string, headers: IncomingHttpHeaders): Promise<DisplayResponse> {
    const accessToken = readAccessToken(headers);
    updateBattery(Number(headers['battery-voltage']));
    if (BYOS_PROXY && !displayFromProxy) {
        displayFromProxy = true;
        const proxyResp = await getProxyResult(headers);
        if (proxyResp) {
            return proxyResp;
        }
    }
    displayFromProxy = false;
    if (accessToken !== BYOS_DEVICE_ACCESS_TOKEN) {
        console.error(`[DISPLAY] [${macId}] Wrong access-token value from device: ${accessToken}`);
        throw new Error('Wrong access-token value from device');
    }
    const {screenUrl, screenHash} = await screenUrlAndHash();
    checkImage(screenUrl);
    return {
        status: 0,
        filename: 'custom-screen-' + screenHash, // screen wouldn't update if data is not changed
        image_url: screenUrl,
        refresh_rate: REFRESH_RATE_SECONDS,
        reset_firmware: false,
        update_firmware: false,
        firmware_url: '',
        special_function: BUTTON_2_CLICK_FUNCTION,
    };
}

async function getProxyResult(headers: IncomingHttpHeaders): Promise<DisplayResponse | null> {
    const response = await proxyDisplay(headers);
    if (!response) {
        return null;
    }
    if (!ALLOW_FIRMWARE_UPDATE) {
        response.update_firmware = false;
        response.reset_firmware = false;
    }
    response.refresh_rate = REFRESH_RATE_SECONDS;
    response.special_function = BUTTON_2_CLICK_FUNCTION;
    if (response.image_url) {
        checkImage(response.image_url);
    } else {
        if (!response.update_firmware && !response.reset_firmware) {
            return null;
        }
    }
    return response;
}

function checkImage(url: string) {
    fetch(url).then(
        async (response) => {
            if (!response.ok) {
                console.error('Failed to check image ' + url);
            }
            const data = await response.text();
            if (data.length < 1000) {
                console.error('Failed to check image ' + url);
            }
        }
    ).catch(() => console.error('Failed to check image ' + url));
}


function readAccessToken(headers: IncomingHttpHeaders): string {
    if (typeof headers['access-token'] !== 'string') {
        throw new Error('Missing access-token header');
    }
    return headers['access-token'];
}