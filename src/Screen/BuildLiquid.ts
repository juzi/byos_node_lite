import {Liquid} from 'liquidjs';
import {TEMPLATE_FOLDER} from "Config.js";
import {NightscoutData} from "../Data/NightscoutData.js";

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


