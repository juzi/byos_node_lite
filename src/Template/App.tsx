import {TemplateData} from "../Data/PrepareData.js";
import Time from "./Time.js";
import HackerNews from "./HackerNews.js";
import Wallpaper from "./Wallpaper.js";

export let templateData: TemplateData;

export default function App(data: TemplateData) {
    templateData = data; // easier than passing to children via props
    return <div style={{
        fontSize: 22,
        display: 'flex',
        width: '800px',
        height: '480px',
    }}>
        <div style={{display: 'flex', flexDirection: 'column', width: '50%', height: '100%'}}>
            <Time style={{alignSelf: 'flex-start'}}/>
            <HackerNews style={{width: '100%', height: '100%'}}/>
        </div>
        <Wallpaper style={{width: '50%', height: '100%'}}/>
    </div>
}
