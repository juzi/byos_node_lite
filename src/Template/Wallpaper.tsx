import {LocalImage} from "./LocalImage.js";
import {ASSETS_FOLDER} from "../Config.js";

export default function Wallpaper({style}: { style?: React.CSSProperties }) {
    return <div style={{display: 'flex', overflow: 'hidden', ...style}}>
        <LocalImage style={{height: '100%', marginLeft: '-160px'}} file={ASSETS_FOLDER + '/images/wallpaper.jpeg'}/>
    </div>
}