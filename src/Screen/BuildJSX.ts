import {ReactNode} from "react";
import {renderToString} from "react-dom/server";
import {NightscoutData} from "../Data/NightscoutData.js";


export async function buildJSX(component: (props: any) => ReactNode, data: NightscoutData): Promise<string> {
    return renderToString(component(data));
}
