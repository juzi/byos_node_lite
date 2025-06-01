import express from "express";
import {SECRET_KEY, SERVER_HOST, SERVER_PORT, PUBLIC_URL_ORIGIN, BYOS_ENABLED, REFRESH_RATE_SECONDS} from "./Config.js";
import {buildScreen, screenUrlAndHash} from "./Utils/Screen.js";
import {BYOSRoutes} from "./BYOS/BYOSRoutes.js";

const app = express();
app.use(express.json());

if (BYOS_ENABLED) {
    app.use('/api', BYOSRoutes);
}

app.get('/', (req, res) => {
    res.send();
})

function isSecretKeyValid(req, res) {
    if (req.query['secret_key'] !== SECRET_KEY) {
        res.setHeader('Content-Type', 'application/json');
        res.status(401).json('Wrong or missing secret_key');
        return false;
    }
    return true;
}

app.get('/plugin/redirect', async (req, res) => {
    if (!isSecretKeyValid(req, res)) {
        return;
    }
    const {screenUrl, screenHash} = await screenUrlAndHash();
    res.setHeader('Content-Type', 'application/json');
    res.json({
        filename: 'custom-screen-' + screenHash, // screen wouldn't update if data is not changed
        url: screenUrl,
        refresh_rate: REFRESH_RATE_SECONDS,
    });
});

app.get('/image', async (req, res) => {
    if (!isSecretKeyValid(req, res)) {
        return;
    }
    const image1bit = await buildScreen();
    res.setHeader('Content-Type', 'image/bmp');
    res.send(image1bit);
})

app.use((req, res) => {
    console.log(`[404] ${req.method} ${req.url}`);
    res.status(404).json({error: 'Not Found', message: 'The requested path could not be found: ' + req.url});
});

app.use((err: Error, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({error: 'Internal Server Error', message: 'Something went wrong!'});
});

app.listen(SERVER_PORT, SERVER_HOST, (error) => {
    if (error) {
        throw error;
    } else {
        console.log(`Server started. Check it http://127.0.0.1:${SERVER_PORT}/image?secret_key=... OR ${PUBLIC_URL_ORIGIN}/image?secret_key=...`);
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