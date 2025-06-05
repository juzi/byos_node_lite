import puppeteer from "puppeteer";
import fs from 'fs/promises';
import {ASSETS_FOLDER} from "Config.js";

export const BASE_URL_CHROME = 'http://localhost';

const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-web-security']});
const page = await browser.newPage();
await page.setViewport({width: 800, height: 480});
await page.setRequestInterception(true);
page.on('pageerror', ({message}) => console.error('error:', message));
page.on('requestfailed', request => console.log(`Failed: ${request.failure()?.errorText} ${request.url()}`));
// page.on('console', message => console.log('console: ', message.text()));
page.on('request', async (interceptedRequest) => {
    if (interceptedRequest.isInterceptResolutionHandled()) {
        return;
    }
    const url = interceptedRequest.url();
    if (!url.startsWith(BASE_URL_CHROME + '/assets/')) {
        await interceptedRequest.continue();
        return;
    }
    try {
        const filePathPart = url.replace(BASE_URL_CHROME + '/assets/', '/')
        const file = await fs.readFile(ASSETS_FOLDER + filePathPart);
        await interceptedRequest.respond({body: file});
    } catch (error) {
        await interceptedRequest.abort();
    }
});


export async function renderToImage(html: string) {
    await page.setContent(html, {waitUntil: "load"});
    const image: Uint8Array = await page.screenshot();
    return Buffer.from(image);
}