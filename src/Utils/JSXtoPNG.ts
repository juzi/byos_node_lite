import satori from "satori";
import {readFileSync} from "node:fs";
import {Resvg} from "@resvg/resvg-js";
import {ReactNode} from "react";
import {emojiToSvg} from "./EmojiToSvg.js";
import {ASSETS_FOLDER} from "../Config.js";

export async function JSXtoPNG(Component: ReactNode) {
    const svg = await satori(
        Component,
        {
            width: 800,
            height: 480,
            fonts: [
                {
                    name: 'Inter',
                    data: readFileSync(ASSETS_FOLDER + '/fonts/Inter_18pt-Regular.ttf'),
                    weight: 400,
                    style: 'normal',
                },
            ],
            loadAdditionalAsset: async (type, segment) => {
                if (type === 'emoji') {
                    return 'data:image/svg+xml;base64,' + btoa(await emojiToSvg(segment));
                }
                console.debug('unknown segment', segment);
                return segment;
            }
        },
    )
    const resvg = new Resvg(svg, {
        background: '#ffffff',
    });
    const pngData = resvg.render();
    return pngData.asPng();
}