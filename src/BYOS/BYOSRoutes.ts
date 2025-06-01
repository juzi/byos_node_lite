import {Router} from 'express';
import {displayRoute} from "./Display.js";
import {setupRoute} from "./Setup.js";
import {logRoute} from "./Log.js";
import {BYOS_DEVICE_MAC, BYOS_ENABLED} from "../Config.js";

// all routes starts with /api/
export const BYOSRoutes = Router();

BYOSRoutes.use((req, res, next) => {
    const macId = getMacId(req);
    if (!BYOS_ENABLED || !BYOS_DEVICE_MAC) {
        console.error(`[BYOS] [${macId}] device is trying to connect, but BYOS is disabled`);
        res.status(401).json('BYOS is disabled');
        return;
    }
    if (macId !== BYOS_DEVICE_MAC) {
        console.error(`[BYOS] [${macId}] device is tried to connect with other MAC, that allowed - rejected`);
        res.status(401).json('This MAC is not allowed');
        return;
    }
    next();
});


BYOSRoutes.get('/setup', async (req, res) => {
    const macId = getMacId(req);
    res.json(await setupRoute(macId));
});

BYOSRoutes.get('/display', async (req, res) => {
    const macId = getMacId(req);
    res.json(await displayRoute(macId, req.headers));
});

BYOSRoutes.post('/log', async (req, res) => {
    const macId = getMacId(req);
    const accessToken = readAccessToken(req.headers);
    await logRoute(macId, accessToken, req.body);
    res.status(204).send();
});

function getMacId(req): string {
    if (typeof req.headers.id !== 'string') {
        throw new Error('Missing id header');
    }
    return req.headers.id;
}

function readAccessToken(headers): string {
    if (typeof headers['access-token'] !== 'string') {
        throw new Error('Missing access-token header');
    }
    return headers['access-token'];
}