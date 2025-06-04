import express, {Request, Response} from "express";
import {
    SECRET_KEY,
    SERVER_HOST,
    SERVER_PORT,
    BYOS_ENABLED,
    REFRESH_RATE_SECONDS,
    SCREEN_URL
} from "./Config.js";
import {buildScreen, checkImage, getScreenHash} from "./Screen/Screen.js";
import {BYOSRoutes} from "./BYOS/BYOSRoutes.js";
import {ROUTE_IMAGE, ROUTE_PLUGIN_REDIRECT} from "./Routes.js";

const app = express();
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

app.use((req: Request, res: Response) => {
    console.log(`[404] ${req.method} ${req.url}`);
    res.status(404).json({error: 'Not Found', message: 'The requested path could not be found: ' + req.url});
});

app.use((err: Error, _: Request, res: Response) => {
    console.error(err.stack);
    res.status(500).json({error: 'Internal Server Error', message: 'Something went wrong!'});
});

app.listen(SERVER_PORT, SERVER_HOST, (error) => {
    if (error) {
        throw error;
    } else {
        console.log(`Server started. Check it http://127.0.0.1:${SERVER_PORT + ROUTE_IMAGE}?secret_key=... OR ${SCREEN_URL}`);
        checkImage(SCREEN_URL);
    }
})

process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason: any) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});