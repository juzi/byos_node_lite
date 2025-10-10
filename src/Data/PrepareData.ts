import {getNightscoutData, NightscoutData} from "./NightscoutData.js";


export async function prepareData(): Promise<NightscoutData> {

    return getNightscoutData();
}
