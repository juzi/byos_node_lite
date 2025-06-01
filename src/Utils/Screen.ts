import {prepareData} from "../Data/PrepareData.js";
import {JSXtoPNG} from "./JSXtoPNG.js";
import App from "../Template/App.js";
import {PNGto1BIT} from "./PNGto1BIT.js";
import {sha256} from "./Sha256.js";
import {PUBLIC_URL_ORIGIN, SECRET_KEY} from "../Config.js";

export async function buildScreen() {
    const data = await prepareData();
    const image = await JSXtoPNG(App(data));
    return PNGto1BIT(image);
}


export async function screenUrlAndHash() {
    const screenUrl = PUBLIC_URL_ORIGIN + '/image?secret_key=' + SECRET_KEY;
    const screenHash = sha256(await buildScreen());
    return {screenUrl, screenHash};
}