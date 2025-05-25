import {prepareData} from "../Data/PrepareData.js";
import {JSXtoPNG} from "./JSXtoPNG.js";
import App from "../Template/App.js";
import {PNGto1BIT} from "./PNGto1BIT.js";
import {sha256} from "./Sha256.js";

export async function buildScreen() {
    const data = await prepareData();
    const image = await JSXtoPNG(App(data));
    return PNGto1BIT(image);
}

export async function screenHash() {
    const screen = await buildScreen();
    return sha256(screen);
}