import {Liquid} from 'liquidjs';
import {TEMPLATE_FOLDER} from "Config.js";
import {NightscoutData} from "../Data/NightscoutData.js";
import {PanelData} from "../Data/PanelData.js";

const engine = new Liquid({
    root: TEMPLATE_FOLDER,
    extname: '.liquid',
    cache: false,
    dynamicPartials: true,
    strictFilters: true,
    strictVariables: true,
});

export async function buildLiquid(templateFile: string, data: NightscoutData): Promise<void> {
    return engine.renderFile(templateFile, data);
}

/**
 * Same engine, but typed to return the string it actually produces. The CrowPanel template is
 * rendered at a different size and without the 1-bit conversion, so its caller needs the HTML
 * rather than the void the TRMNL path has always declared.
 */
export async function buildLiquidPanel(templateFile: string, data: PanelData): Promise<string> {
    return engine.renderFile(templateFile, data);
}


