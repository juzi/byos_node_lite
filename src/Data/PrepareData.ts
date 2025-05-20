import {TIMEZONE} from "../Config.js";
import {getHackerNews, HackerNewsData} from "./HackerNewsData.js";

export type TemplateData = {
    time: string
    hackerNews: HackerNewsData,
}

export async function prepareData(): Promise<TemplateData> {
    const time = new Date().toLocaleTimeString(undefined, {
        timeZone: TIMEZONE,
        hour: 'numeric',
    });
    const hackerNews = await getHackerNews();
    return {
        time,
        hackerNews,
    }
}
