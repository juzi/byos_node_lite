import {TemplateData} from "../Data/PrepareData.js";
import Time from "./Time.js";
import HackerNews from "./HackerNews.js";

export let templateData: TemplateData;

export default function App(data: TemplateData) {
    templateData = data; // easier than passing to children via props
    return <div style={{
        fontSize: 22,
        display: 'flex',
        width: '100%',
        height: '100%',
    }}>
        <HackerNews style={{left: '30px'}}/>
        <Time style={{position: 'absolute', top: 8, right: 10}}/>
    </div>
}
