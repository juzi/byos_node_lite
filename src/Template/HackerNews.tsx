import {templateData} from "./App.js";

export default function HackerNews({style}: { style?: React.CSSProperties }) {
    return <div style={{display: 'flex', flexDirection: 'column', ...style}}>
        <h3>Hacker News</h3>
        <div style={{display: 'flex', fontSize: '15px', flexDirection: 'column', width: '300px'}}>
            {templateData.hackerNews.map((hn) =>
                <div style={{display: 'flex'}} key={hn.id}>- {hn.title}</div>)}
        </div>
    </div>
}