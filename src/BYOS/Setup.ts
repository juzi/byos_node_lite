import {BYOS_DEVICE_ACCESS_TOKEN, BYOS_PROXY} from "../Config.js";
import {proxySetup} from "./Proxy.js";

export type SetupResponse = {
    status: number,
    api_key: string,
    friendly_id: string,
    image_url: string,
    message: string,
}

export async function setupRoute(macId: string): Promise<SetupResponse> {
    console.log(`[SETUP] [${macId}] device is trying to connect.`);
    if (BYOS_PROXY) {
        const proxyResp = await proxySetup(macId);
        if (proxyResp) {
            console.log(`[SETUP] [${macId}] [PROXY] ${proxyResp.message}`);
            console.log(`[SETUP] [${macId}] [PROXY] received access-token ${proxyResp.api_key}`);
            return proxyResp;
        }
    }
    return {
        "status": 200,
        "image_url": '',
        "api_key": BYOS_DEVICE_ACCESS_TOKEN,
        "friendly_id": "TRMNL",
        "message": "Device successfully registered",
    };
}