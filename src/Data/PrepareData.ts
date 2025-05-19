import {TIMEZONE} from "../Config.js";

export type TemplateData = {
    time: string
}

export async function prepareData(): Promise<TemplateData> {
    const time = new Date().toLocaleTimeString(undefined, {
        timeZone: TIMEZONE,
        hour: 'numeric',
    });

    return {
        time,
    }
}
