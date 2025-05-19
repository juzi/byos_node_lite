import {TemplateData} from "../Data/PrepareData.js";
import Time from "./Time.js";

export let templateData: TemplateData;

export default function App(data: TemplateData) {
    templateData = data; // easier than passing to children via props
    return <div style={{
        fontSize: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    }}>
        <Time style={{position: 'absolute', top: 8, right: 10}}/>
    </div>
}
