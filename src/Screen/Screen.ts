import {TEMPLATE_FOLDER} from "Config.js";
import {renderToImage} from "./RenderHTML.js";
import {buildLiquid} from "./BuildLiquid.js";
import crypto from "crypto";
import {readFileSync} from "node:fs";
import {PNGto1BIT} from "./PNGto1BIT.js";
import {getNightscoutData, NightscoutData} from "../Data/NightscoutData.js";

const headerHtml = readFileSync(TEMPLATE_FOLDER + '/Header.html', 'utf8');

const screens = [
    // you can leave one or add more
//    (data: TemplateDataType) => buildJSX(App, data),
    (data: NightscoutData) => buildLiquid('Nightscout', data),
];

export async function buildScreen() {
    const randomScreen = screens[Math.floor(Math.random() * screens.length)];
    const templateData = await getNightscoutData();
    const html = await randomScreen(templateData);
    const image = await renderToImage(headerHtml + html);
    return PNGto1BIT(image);
}

export async function getScreenHash() {
    const image = await buildScreen();
    return crypto.createHash('sha256').update(image).digest('hex');
}

export async function checkImageUrl(url: string): Promise<boolean> {
    let response;
    try {
        response = await fetch(url);
    } catch (error: any) {
        console.error(`Failed to check image ${url} - ${error.message}`);
        return false;
    }
    if (!response.ok) {
        console.error(`Failed to check image ${url} - got ${response.status} code`);
        return false;
    }
    const data = await response.text();
    if (data.length < 1000) {
        console.error(`Failed to check image ${url} - no content`);
        return false;
    }
    return true;
}
