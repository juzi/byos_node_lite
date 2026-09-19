import puppeteer, {Browser, Page} from "puppeteer";
import fs from 'fs/promises';
import {ASSETS_FOLDER, IS_TEST_ENV} from "Config.js";

export const BASE_URL_CHROME = 'http://localhost';

/**
 * A single CDP call may take this long. It has to cover a screenshot on a loaded machine, so it is
 * generously above what a render costs -- but it stays bounded, because a wedged Chrome must fail
 * the request rather than hold it open forever. A failure is recovered from, see withFreshBrowser.
 */
const PROTOCOL_TIMEOUT_MS = 20_000;

/** Renders per page before it is thrown away. At one screen a minute that is half a day. */
const RENDERS_PER_PAGE = 720;

let browser: Browser | null = null;
let page: Page | null = null;
let colorPage: Page | null = null;
let count: number = 0;
let colorCount: number = 0;
let queue: Promise<unknown> = Promise.resolve();

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

/**
 * Drops Chrome and everything pointing into it. Every path that wants a new browser goes through
 * here first: launching on top of a running browser used to leak the old process, and those
 * leftovers were what eventually starved the machine into screenshot timeouts.
 */
export async function closeBrowser() {
    const dying = browser;
    browser = null;
    page = null;
    colorPage = null;
    count = 0;
    colorCount = 0;
    if (!dying) {
        return;
    }
    try {
        await dying.close();
    } catch (error) {
        // A browser that no longer answers CDP cannot be asked to leave politely.
        console.error('Could not close Chrome cleanly:', error instanceof Error ? error.message : error);
        dying.process()?.kill('SIGKILL');
    }
}

export async function initPuppeteer() {
    if (!IS_TEST_ENV) {
        console.log('start of Puppeteer init');
    }
    await closeBrowser();
    const launched = await puppeteer.launch({
            headless: true,
            protocolTimeout: PROTOCOL_TIMEOUT_MS,
            timeout: PROTOCOL_TIMEOUT_MS,
            args: [
                '--no-sandbox',
                '--disable-web-security',
                '--disable-gpu',
            ]
        }
    );
    browser = launched;
    // If Chrome dies on its own, forget it here too, so the next render launches a fresh one
    // instead of talking to a socket nobody is listening on.
    launched.on('disconnected', () => {
        if (browser === launched) {
            browser = null;
            page = null;
            colorPage = null;
        }
    });
    page = await launched.newPage();
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
    if (!page || page.isClosed()) {
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

/**
 * One render at a time. A page holds a single document, so two overlapping requests -- the panel
 * and the TRMNL screen both coming due, or a browser reload landing on top of the device -- would
 * otherwise screenshot each other's content.
 */
function serialized<T>(work: () => Promise<T>): Promise<T> {
    const result = queue.then(work, work);
    queue = result.catch(() => undefined);
    return result;
}

/**
 * Retries once on a brand-new browser. A Chrome that has timed out once keeps timing out: the old
 * code left the broken page in place, so every following request failed too and the screen stayed
 * stuck until someone restarted the service by hand.
 */
async function withFreshBrowser<T>(work: () => Promise<T>): Promise<T> {
    try {
        return await work();
    } catch (error) {
        console.error('Render failed, restarting Chrome:', error instanceof Error ? error.message : error);
        await closeBrowser();
        return await work();
    }
}

export async function renderToImage(html: string): Promise<Buffer> {
    return serialized(() => withFreshBrowser(async () => {
        count++;
        if (count > RENDERS_PER_PAGE) {
            await closeBrowser();
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
        // Chrome only paints the frontmost page, and the panel page may have taken that spot.
        await currentPage.bringToFront();
        const image: Uint8Array = await currentPage.screenshot();
        return Buffer.from(image);
    }));
}

/**
 * Screenshots a page in full colour at an explicit size. Same recycling rule as renderToImage: a
 * long-lived Chrome page leaks, and this one runs for months at a time.
 */
export async function renderColorToImage(html: string, width: number, height: number): Promise<Buffer> {
    return serialized(() => withFreshBrowser(async () => {
        colorCount++;
        if (colorCount > RENDERS_PER_PAGE) {
            if (colorPage && !colorPage.isClosed()) {
                await colorPage.close();
            }
            colorPage = null;
            colorCount = 0;
        }
        const currentPage = await getColorPage(width, height);
        await currentPage.setContent(html, {waitUntil: "domcontentloaded"});
        await currentPage.bringToFront();
        const image: Uint8Array = await currentPage.screenshot({
            clip: {x: 0, y: 0, width: width, height: height},
            omitBackground: false
        });
        return Buffer.from(image);
    }));
}
