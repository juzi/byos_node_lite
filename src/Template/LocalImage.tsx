import {readFileSync} from "node:fs"

export function LocalImage({file, ...props}: { file: string }) {
    const content = readFileSync(file);
    const src = 'data:image/png;base64,' + content.toString('base64');
    return <img src={src} {...props} />;
}