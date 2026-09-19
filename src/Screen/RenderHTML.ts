import puppeteer, {Browser, Page} from "puppeteer";
import fs from 'fs/promises';
import {ASSETS_FOLDER, IS_TEST_ENV} from "Config.js";

export const BASE_URL_CHROME = 'http://localhost';


let browser: Browser | null = null;
let page: Page | null = null;
let colorPage: Page | null = null;
let count: number = 0;
let colorCount: number = 0;

/**
 * Serves /assets/ out of the local folder and lets everything else through. Both the TRMNL page and
 * the panel page need this, so it is installed per page rather than written twice.
 */
async function interceptAssets(target: Page) {
    await target.setRequestInterception(true);
    // A page can throw a value that is not an Error, so puppeteer hands this over as unknown.
    target.on('pageerror', (error: unknown) =>
        console.error('error:', error instanceof Error ? error.message : error));
    target.on('requestfailed', request => console.log(`Failed: ${request.failure()?.errorText} ${request.url()}`));
    target.on('request', async (interceptedRequest) => {
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
}

export async function initPuppeteer() {
    if (!IS_TEST_ENV) {
        console.log('start of Puppeteer init');
    }
    browser = await puppeteer.launch({
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
    await interceptAssets(page);
    if (!IS_TEST_ENV) {
        console.log('end of Puppeteer init');
    }
}


async function getPage(): Promise<Page> {
    if (!page) {
        await initPuppeteer();
    }
    if (!page) {
        throw new Error('Could not open a Puppeteer page');
    }
    return page;
}

/**
 * A second page, at the panel's size and without the grayscale filter. Kept separate from the TRMNL
 * page so neither has to re-set the viewport on every render, and so a crash in one does not take
 * the other's state with it.
 */
async function getColorPage(width: number, height: number): Promise<Page> {
    if (!browser) {
        await initPuppeteer();
    }
    if (!browser) {
        throw new Error('Could not launch Puppeteer');
    }
    if (!colorPage || colorPage.isClosed()) {
        colorPage = await browser.newPage();
        await interceptAssets(colorPage);
        await colorPage.setViewport({width: width, height: height});
    }
    return colorPage;
}


export async function renderToImage(html: string) {
    count++;
    if (count > 720) {
       page = null;
       await initPuppeteer();
       count = 0;
    }
    const currentPage = await getPage();
    await currentPage.addStyleTag({
        content: `
    * {
      filter: grayscale(100%) contrast(1000%) brightness(100%);
      -webkit-filter: grayscale(100%) contrast(1000%) brightness(100%);
    }
    `
    });
    await currentPage.setContent(html, {waitUntil: "domcontentloaded"});
    const image: Uint8Array = await currentPage.screenshot();
    return Buffer.from(image);
}

/**
 * Screenshots a page in full colour at an explicit size. Same recycling rule as renderToImage: a
 * long-lived Chrome page leaks, and this one runs for months at a time.
 */
export async function renderColorToImage(html: string, width: number, height: number): Promise<Buffer> {
    colorCount++;
    if (colorCount > 720) {
        if (colorPage && !colorPage.isClosed()) {
            await colorPage.close();
        }
        colorPage = null;
        colorCount = 0;
    }
    const currentPage = await getColorPage(width, height);
    await currentPage.setContent(html, {waitUntil: "domcontentloaded"});
    const image: Uint8Array = await currentPage.screenshot({
        clip: {x: 0, y: 0, width: width, height: height},
        omitBackground: false
    });
    return Buffer.from(image);
}
