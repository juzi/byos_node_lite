import {JSXtoPNG} from "./Utils/JSXtoPNG.js";
import App from "./Template/App.js";
import express from "express";
import {prepareData} from "./Data/PrepareData.js";
import {SECRET_KEY, SERVER_HOST, SERVER_PORT, PUBLIC_URL_ORIGIN} from "./Config.js";
import {PNGto1BIT} from "./Utils/PNGto1BIT.js";
import crypto from 'crypto';

const app = express();

app.use((req, res, next) => {
    if (req.path === '/') {
        return next();
    }
    if (req.query['secret_key'] !== SECRET_KEY) {
        res.setHeader('Content-Type', 'application/json');
        res.status(401).send(JSON.stringify('Wrong or missing secret_key'));
        return;
    }
    next();
});

app.get('/api', async (req, res) => {
    const data = await prepareData();
    const image = await JSXtoPNG(App(data));
    const imageHash = crypto.createHash('sha256').update(image).digest('hex');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
        // screen wouldn't update if data is not changed
        filename: 'custom-screen-' + imageHash,
        url: PUBLIC_URL_ORIGIN + '/image?secret_key=' + SECRET_KEY,
        refresh_rate: 60, // Seconds. Can be overridden by device settings.
    }));
});

app.get('/image', async (req, res) => {
    const data = await prepareData();
    const image = await JSXtoPNG(App(data));
    const image1bit = await PNGto1BIT(image);
    res.setHeader('Content-Type', 'image/bmp');
    res.send(image1bit);
})

app.get('/', (req, res) => {
    res.send();
})

app.use((req, res) => {
    res.status(404).send({
        error: 'Not Found',
        message: 'The requested path could not be found: ' + req.url
    });
});

app.use((err: Error, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({
        error: 'Internal Server Error',
        message: 'Something went wrong!'
    });
});

app.listen(SERVER_PORT, SERVER_HOST, (error) => {
    if (error) {
        throw error;
    } else {
        console.log(`Server started. Check it http://${SERVER_HOST}:${SERVER_PORT}/api?secret_key=... OR ${PUBLIC_URL_ORIGIN}/api?secret_key=...`);
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