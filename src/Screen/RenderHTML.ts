import puppeteer, {Page} from "puppeteer";
import fs from 'fs/promises';
import {ASSETS_FOLDER, IS_TEST_ENV} from "Config.js";

export const BASE_URL_CHROME = 'http://localhost';


let page: Page;

export async function initPuppeteer() {
    if (!IS_TEST_ENV) {
        console.log('start of Puppeteer init');
    }
    const browser = await puppeteer.launch({
            headless: true,
            protocolTimeout: 5000,
            timeout: 5000,
            args: [
                '--no-sandbox',
                '--disable-web-security',
                '--disable-gpu',
            ]
        }
    );
    page = await browser.newPage();
    const fonts = await page.evaluate(() => {
        return document.fonts.check('12px LiberationSans');
    });
    console.log('LiberationSans available:', fonts);
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
    if (!IS_TEST_ENV) {
        console.log('end of Puppeteer init');
    }
}


export async function renderToImage(html: string) {
    await page.addStyleTag({
        content: `
    * {
      filter: grayscale(100%) contrast(1000%) brightness(100%);
      -webkit-filter: grayscale(100%) contrast(1000%) brightness(100%);
    }
    `
    });
    await page.setContent(html, {waitUntil: "domcontentloaded"});
    const image: Uint8Array = await page.screenshot();
    // const buffer = await sharp(image)
    //     .threshold(0) // Adjust threshold value (0-255) as needed
    //     .toColorspace('b-w')
    //     .toBuffer();

    //return buffer;
    return Buffer.from(image);
}