import {prepareData} from "../Data/PrepareData.js";
import {PNGto1BIT} from "./PNGto1BIT.js";
import {sha256} from "./Sha256.js";
import {PUBLIC_URL_ORIGIN, SECRET_KEY} from "../Config.js";
import {renderToString} from 'react-dom/server';
import {readFile} from "node:fs/promises";
import App from "../Template/JSX/App.js";
import {renderToImage} from "./RenderHTML.js";
import {ReactNode} from "react";


const screens = [
    // you can leave only one or add more
    // () => htmlFromComponent(App),
    () => htmlFromFile('./src/Template/t3.html'),
];

async function htmlFromComponent(component: (props: any) => ReactNode): Promise<string> {
    const fromReact = renderToString(component(await prepareData()));
    return `
<html lang="en">
<head>
    <link rel="stylesheet" href="https://usetrmnl.com/css/latest/plugins.css">
    <script src="https://usetrmnl.com/js/latest/plugins.js"></script>
</head>
<body>${fromReact}</body>
</html>
    `;
}

async function htmlFromFile(path: string): Promise<string> {
    return (await readFile(path)).toString();
}

export async function buildScreen() {
    const randomScreen = screens[Math.floor(Math.random() * screens.length)];
    const html = await randomScreen();
    const image = await renderToImage(html);
    return PNGto1BIT(image);
}


export async function screenUrlAndHash() {
    const screenUrl = PUBLIC_URL_ORIGIN + '/image?secret_key=' + SECRET_KEY;
    // TODO hash of proper screen
    const screenHash = sha256(await buildScreen());
    return {screenUrl, screenHash};
}