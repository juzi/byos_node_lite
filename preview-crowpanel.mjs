// Standalone layout check for CrowPanel.liquid: renders the template with hand-made data and
// writes PNGs, so the design can be reviewed without a Nightscout server or a device.
import {Liquid} from 'liquidjs';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import * as path from 'node:path';
import {writeFileSync} from 'node:fs';

// Uses whatever Chrome puppeteer already downloaded. Set PREVIEW_CHROME to override, which is
// what a container with a system Chromium and no puppeteer download needs.
const CHROME = process.env.PREVIEW_CHROME;
const WIDTH = 1024;
const HEIGHT = 600;
const OUT = process.argv[2] ?? '.';

const engine = new Liquid({
    root: path.join(import.meta.dirname, 'src', 'Template'),
    extname: '.liquid',
    cache: false,
    dynamicPartials: true,
    strictFilters: true,
    strictVariables: true,
});

const base = {
    error: '', sugar: 124, trend: 'Flat', band: 'inRange', sign: '+', delta: 3,
    ageMinutes: 2, ageWarning: false, stale: false,
    sensorRemainingHours: 177, podRemainingHours: 9,
    sensorRemaining: '7d 9h', podRemaining: '0d 9h',
    sensorExpiring: false, podExpiring: true,
    podInsulin: '42 U', podInsulinLow: false,
    refreshSeconds: 60, sleeping: false, serverTime: 1758268800,
};

const cases = {
    'panel-in-range': base,
    'panel-low-falling': {
        ...base, sugar: 62, band: 'low', trend: 'SingleDown', sign: '-', delta: 7,
        sensorRemaining: '0d 14h', sensorRemainingHours: 14, sensorExpiring: true,
    },
    'panel-high-rising': {
        ...base, sugar: 268, band: 'urgentHigh', trend: 'DoubleUp', sign: '+', delta: 14,
        podRemaining: '0d 8h', podRemainingHours: 8, podExpiring: true,
    },
    // 45 degrees is the geometric worst case for the rotated arrow: if the viewBox is too tight,
    // this is where the corners get clipped.
    'panel-diagonal': {...base, sugar: 96, band: 'inRange', trend: 'FortyFiveDown', sign: '-', delta: 5},
    // Widest the cards ever get: two days-and-hours strings at once, no warning triangle to shrink
    // them, plus the widest realistic insulin reading. If this one fits, every real value does.
    'panel-widest': {...base, sugar: 188, band: 'high', trend: 'FortyFiveUp',
        sensorRemaining: '9d 23h', sensorRemainingHours: 239,
        podRemaining: '2d 23h', podRemainingHours: 71,
        podInsulin: '168.5 U'},
    // One missed reading, and simultaneously the widest the top row ever gets: triangle plus a
    // three-digit value plus a double arrow plus a two-digit delta.
    'panel-age-warning': {...base, sugar: 268, band: 'urgentHigh', trend: 'DoubleUp', sign: '+', delta: 14,
        ageMinutes: 8, ageWarning: true},
    'panel-stale': {...base, sugar: 143, trend: 'None', ageMinutes: 41, ageWarning: true, stale: true, sign: '±', delta: 0},
    'panel-error': {...base, error: 'Could not get entries. Code 502', band: 'unknown'},
    // The pod is fresh (not podExpiring) but the reservoir is the thing that's actually low -- this
    // is what checks that podInsulinLow alone, without podExpiring, still turns the card red.
    'panel-pod-insulin-low': {...base, podExpiring: false, podRemaining: '2d 6h', podRemainingHours: 54,
        podInsulin: '7.5 U', podInsulinLow: true},
    // No pump status at all -- the card should read as a plain, non-alarming '--' rather than a
    // blank or a zero.
    'panel-pod-insulin-unknown': {...base, podExpiring: false, podInsulin: '--', podInsulinLow: false},
};

const browser = await puppeteer.launch({
    ...(CHROME ? {executablePath: CHROME} : {}),
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.setViewport({width: WIDTH, height: HEIGHT});

for (const [name, data] of Object.entries(cases)) {
    const html = await engine.renderFile('CrowPanel', data);
    await page.setContent(html, {waitUntil: 'domcontentloaded'});
    const png = await page.screenshot({clip: {x: 0, y: 0, width: WIDTH, height: HEIGHT}});
    writeFileSync(path.join(OUT, name + '.png'), png);

    // Same packing the server does, so the byte count is checked here too.
    const {data: rgb, info} = await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject: true});
    const packed = Buffer.allocUnsafe(WIDTH * HEIGHT * 2);
    for (let s = 0, t = 0; t < packed.length; s += 3, t += 2) {
        packed.writeUInt16LE(((rgb[s] & 0xf8) << 8) | ((rgb[s + 1] & 0xfc) << 3) | (rgb[s + 2] >> 3), t);
    }
    console.log(name, info.width + 'x' + info.height, 'png', png.length, 'rgb565', packed.length);
}

await browser.close();
