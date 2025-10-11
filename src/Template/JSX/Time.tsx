export default function Time({style}: { style: React.CSSProperties }) {
    return <div style={{
        backgroundColor: '#000',
        color: '#fff',
        padding: '3px',
        display: 'flex',
        ...style
    }}>
        <div></div>
    </div>;
}