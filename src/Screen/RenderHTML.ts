import puppeteer from "puppeteer";

const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-web-security']});
const page = await browser.newPage();
await page.setViewport({width: 800, height: 480});
page.on('pageerror', ({message}) => console.error('error:', message))
    .on('requestfailed', request => console.log(`Failed: ${request.failure()?.errorText} ${request.url()}`))

// .on('console', message => console.log('console: ', message.text()))

export async function renderToImage(html: string) {
    await page.setContent(html, {waitUntil: "networkidle0"});
    const image: Uint8Array = await page.screenshot();
    return Buffer.from(image);
}