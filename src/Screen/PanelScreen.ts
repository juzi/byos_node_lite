import sharp from 'sharp';
import {buildLiquidPanel} from './BuildLiquid.js';
import {getPanelData} from '../Data/PanelData.js';
import {renderColorToImage} from './RenderHTML.js';

// The CrowPanel Advance 9" is fixed at this size, and so is the template's layout. The panel checks
// the byte count it receives against the same numbers, so a mismatch is caught rather than drawn.
export const PANEL_WIDTH = 1024;
export const PANEL_HEIGHT = 600;
export const PANEL_RGB565_BYTES = PANEL_WIDTH * PANEL_HEIGHT * 2;

const PANEL_TEMPLATE = 'CrowPanel';

export type PanelImage = {
    data: Buffer;
    // Passed to the panel in a response header so one request carries both the picture and when to
    // come back for the next one.
    refreshSeconds: number;
}

/** The panel screen as PNG. Used for previewing the layout in a browser while editing the template. */
export async function buildPanelPng(): Promise<PanelImage> {
    const data = await getPanelData();
    const html = await buildLiquidPanel(PANEL_TEMPLATE, data);
    const png = await renderColorToImage(html, PANEL_WIDTH, PANEL_HEIGHT);
    return {data: png, refreshSeconds: data.refreshSeconds};
}

/**
 * The panel screen as raw little-endian RGB565, which is exactly what the panel's LVGL canvas holds.
 *
 * Sending pixels rather than a PNG or JPEG means the firmware needs no decoder at all -- it reads
 * the body straight into the canvas buffer. At 1.2 MB once every five minutes on a LAN, the
 * bandwidth costs nothing and buys the device an entire missing dependency.
 */
export async function buildPanelRgb565(): Promise<PanelImage> {
    const png = await buildPanelPng();
    const {data, info} = await sharp(png.data)
        .removeAlpha()
        .raw()
        .toBuffer({resolveWithObject: true});

    if (info.width !== PANEL_WIDTH || info.height !== PANEL_HEIGHT) {
        throw new Error('Panel rendered at ' + info.width + 'x' + info.height
            + ' instead of ' + PANEL_WIDTH + 'x' + PANEL_HEIGHT);
    }

    return {data: packRgb565(data), refreshSeconds: png.refreshSeconds};
}

/**
 * RGB888 to RGB565, little-endian because that is what LVGL expects when LV_COLOR_16_SWAP is off --
 * which is how the CrowPanel's sdkconfig leaves it.
 */
function packRgb565(rgb: Buffer): Buffer {
    const packed = Buffer.allocUnsafe(PANEL_RGB565_BYTES);
    for (let source = 0, target = 0; target < PANEL_RGB565_BYTES; source += 3, target += 2) {
        const pixel = ((rgb[source]! & 0xf8) << 8) | ((rgb[source + 1]! & 0xfc) << 3) | (rgb[source + 2]! >> 3);
        packed.writeUInt16LE(pixel, target);
    }
    return packed;
}
