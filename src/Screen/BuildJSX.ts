import {ReactNode} from "react";
import {renderToString} from "react-dom/server";
import {TemplateDataType} from "../Data/PrepareData.js";

export async function buildJSX(component: (props: any) => ReactNode, data: TemplateDataType): Promise<string> {
    const fromReact = renderToString(component(data));
    return `
<html lang="en">
<head>
    <link rel="stylesheet" href="https://usetrmnl.com/css/latest/plugins.css">
    <script src="https://usetrmnl.com/js/latest/plugins.js"></script>
</head>
<body>${fromReact}</body>
</html>
    `;
}
