import {Router} from 'express';
import {BYOS_DEVICE_MAC, PUBLIC_URL_ORIGIN, SECRET_KEY} from '../Config.js';
import {screenHash} from "../Utils/Screen.js";
import {sha256} from "../Utils/Sha256.js";

// all routes starts with /api/
export const BYOSRoutes = Router();


BYOSRoutes.post('/log', (req, res) => {
    const macId = getMacId(req);
    const data = req.body;
    if (!data['log'] || !data['log']['logs_array']) {
        res.status(204).send();
        return;
    }
    data['log']['logs_array'].map(record => {
        let ts = record['creation_timestamp'];
        if (ts) {
            ts = new Date(ts * 1000).toISOString();
        }
        console.log([
            `[LOG]`,
            `[${macId}]`,
            `EVENT_TIME`,
            ts,
            record['log_message'],
            'file:' + record['log_sourcefile'] + ':' + record['log_codeline']
        ].join(' '))
    });
    res.status(204).send();
});

BYOSRoutes.get('/display', async (req, res) => {
    const macId = getMacId(req);
    if (readDeviceKey(req) !== calcProperDeviceApiKey(macId)) {
        console.error(`[DISPLAY] [${macId}] Wrong access-token value from device: ` + readDeviceKey(req));
        res.status(403).send();
        return;
    }
    batteryPercentage = calcBattery(Number(req.headers['battery-voltage']));
    res.json({
        // screen wouldn't update if data is not changed
        filename: 'custom-screen-' + await screenHash(),
        image_url: PUBLIC_URL_ORIGIN + '/image?secret_key=' + SECRET_KEY,
        refresh_rate: 60, // Seconds. Can be overridden by device settings.
    });
});

BYOSRoutes.get('/setup', (req, res) => {
    const macId = getMacId(req);
    if (!BYOS_DEVICE_MAC) {
        console.error(`[SETUP] [${macId}] device is trying to connect, but BYOS is disabled`);
    }
    if (macId !== BYOS_DEVICE_MAC) {
        console.error(`[SETUP] [${macId}] device is tried to connect with other MAC, that allowed - rejected`);
        res.status(403).send();
        return;
    }
    console.log(`[SETUP] [${macId}] device is trying to connect.`);
    res.json({
        "status": 200,
        "api_key": calcProperDeviceApiKey(macId),
        "friendly_id": "TRMNL",
        "message": "Device successfully registered",
    });
});


export let batteryPercentage = 0;

function calcBattery(voltage: number) {
    const minVoltage = 0.45;
    const maxVoltage = 4.05;
    const minPercentage = 10;
    const maxPercentage = 90;
    if (voltage <= minVoltage) return minPercentage;
    if (voltage > maxVoltage) return 100;
    const percentage = (voltage - minVoltage) / (maxVoltage - minVoltage) *
        (maxPercentage - minPercentage) + minPercentage;
    return Math.round(percentage);
}


function getMacId(req): string {
    if (typeof req.headers.id !== 'string') {
        throw new Error('Missing id header');
    }
    return req.headers.id;
}

function calcProperDeviceApiKey(macID: string) {
    return sha256(SECRET_KEY + macID);
}

function readDeviceKey(req): string {
    if (typeof req.headers['access-token'] !== 'string') {
        throw new Error('Missing access-token header');
    }
    return req.headers['access-token'];
}
