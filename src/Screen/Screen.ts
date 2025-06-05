import {prepareData, TemplateDataType} from "Data/PrepareData.js";
import {PNGto1BIT} from "./PNGto1BIT.js";
import {TEMPLATE_FOLDER} from "Config.js";
import App from "Template/JSX/App.js";
import {renderToImage} from "./RenderHTML.js";
import {buildLiquid} from "./BuildLiquid.js";
import {buildJSX} from "./BuildJSX.js";
import crypto from "crypto";
import {readFileSync} from "node:fs";

const headerHtml = readFileSync(TEMPLATE_FOLDER + '/Header.html', 'utf8');

const screens = [
    // you can leave one or add more
    (data: TemplateDataType) => buildJSX(App, data),
    (data: TemplateDataType) => buildLiquid('HackerNews', data),
];

export async function buildScreen() {
    const randomScreen = screens[Math.floor(Math.random() * screens.length)];
    const templateData = await prepareData();
    const html = await randomScreen(templateData);
    const image = await renderToImage(headerHtml + html);
    return PNGto1BIT(image);
}

export async function getScreenHash() {
    const image = await buildScreen();
    return crypto.createHash('sha256').update(image).digest('hex');
}

export function checkImage(url: string) {
    fetch(url)
        .then(
            async (response) => {
                if (!response.ok) {
                    console.error(`Failed to check image ${url} - got ${response.status} code`);
                }
                const data = await response.text();
                if (data.length < 1000) {
                    console.error(`Failed to check image ${url} - no content`);
                }
            }
        )
        .catch((error) => console.error(`Failed to check image ${url} - ${error.message}`));
}
