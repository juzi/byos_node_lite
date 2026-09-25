import express, {NextFunction, Request, Response} from "express";
import {
    BYOS_ENABLED,
    IS_TEST_ENV,
    REFRESH_RATE_SECONDS,
    SCREEN_URL,
    SECRET_KEY,
    SERVER_HOST,
    SERVER_PORT
} from "Config.js";
import {buildScreen, checkImageUrl, getScreenHash} from "Screen/Screen.js";
import {BYOSRoutes} from "BYOS/BYOSRoutes.js";
import {ROUTE_IMAGE, ROUTE_PANEL, ROUTE_PANEL_PNG, ROUTE_PANEL_RAW, ROUTE_PLUGIN_REDIRECT} from "Routes.js";
import {getPanelData} from "Data/PanelData.js";
import {buildPanelPng, buildPanelRgb565} from "Screen/PanelScreen.js";
import {initPuppeteer} from "./Screen/RenderHTML.js";

export const app = express();
app.use(express.json());

if (BYOS_ENABLED) {
    app.use('/api', BYOSRoutes);
}

app.get('/', (_, res: Response) => {
    res.send();
})

function isSecretKeyValid(req: Request, res: Response) {
    if (req.query['secret_key'] !== SECRET_KEY) {
        res.setHeader('Content-Type', 'application/json');
        res.status(401).json('Wrong or missing secret_key');
        return false;
    }
    return true;
}

app.get(ROUTE_PLUGIN_REDIRECT, async (req: Request, res: Response) => {
    if (!isSecretKeyValid(req, res)) {
        return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.json({
        filename: 'custom-screen-' + await getScreenHash(), // screen wouldn't update if data is not changed
        url: SCREEN_URL,
        refresh_rate: REFRESH_RATE_SECONDS,
	maximum_compatibility: true
    });
});

app.get(ROUTE_IMAGE, async (req: Request, res: Response) => {
    if (!isSecretKeyValid(req, res)) {
        return;
    }
    const image1bit = await buildScreen();
    res.setHeader('Content-Type', 'image/bmp');
    res.send(image1bit);
})

/**
 * What the CrowPanel screen is built from, as JSON. Not used by the panel itself -- it is here to
 * check what the server thinks the numbers are without having to read them off a photograph.
 */
app.get(ROUTE_PANEL, async (req: Request, res: Response) => {
    if (!isSecretKeyValid(req, res)) {
        return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(await getPanelData());
})

/**
 * The panel screen as a PNG, for looking at the layout in a browser while editing CrowPanel.liquid.
 * Iterating on the design costs a reload here rather than a reflash of the device.
 */
app.get(ROUTE_PANEL_PNG, async (req: Request, res: Response) => {
    if (!isSecretKeyValid(req, res)) {
        return;
    }
    const panel = await buildPanelPng();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(panel.data);
})

/**
 * What the panel actually fetches: raw little-endian RGB565, straight into its canvas buffer. The
 * refresh interval rides along in a header so one request answers both 'what do I draw' and 'when
 * do I come back'.
 */
app.get(ROUTE_PANEL_RAW, async (req: Request, res: Response) => {
    if (!isSecretKeyValid(req, res)) {
        return;
    }
    const panel = await buildPanelRgb565();
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Refresh-Seconds', String(panel.refreshSeconds));
    res.setHeader('X-Sleep', panel.sleeping ? '1' : '0');
    res.setHeader('X-Alarm', panel.alarm ? '1' : '0');
    res.send(panel.data);
})

app.use((req: Request, res: Response) => {
    console.log(`[404] ${req.method} ${req.url}`);
    res.status(404).json({error: 'Not Found', message: 'The requested path could not be found: ' + req.url});
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({error: 'Internal Server Error', message: 'Something went wrong!'});
});

if (!IS_TEST_ENV) {
    const serverHost: string = process.env['SERVER_HOST'] || SERVER_HOST;
    app.listen(SERVER_PORT, serverHost, async (error) => {
        if (error) {
            throw error;
        } else {
            await initPuppeteer();
            console.log(`Server started. Check it http://127.0.0.1:${SERVER_PORT + ROUTE_IMAGE}?secret_key=... OR ${SCREEN_URL}`);
            checkImageUrl(SCREEN_URL);
        }
    })
}
