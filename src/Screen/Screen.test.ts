import {expect, test} from "vitest";
import {checkImage} from "./Screen.js";

test('checkImage', async () => {
    const result = await checkImage('https://github.com/usetrmnl/byos_node_lite/blob/main/assets/images/wallpaper.jpeg?raw=true');
    expect(result).toBeTruthy();
})