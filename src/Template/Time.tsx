import {templateData} from "./App.js";

export default function Time({style}: { style: React.CSSProperties }) {
    return <div style={style}>
        {templateData.time}</div>;
}