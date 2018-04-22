import { h } from "preact";
// import "./alert.scss";

export enum AlertTypes {
    Primary = "primary", Secondary = "secondary", Success = "success", Danger = "danger", Warning = "warning", Info = "info", Light = "light", Dark = "dark"
}

// tslint:disable-next-line:interface-name
export interface AlertAttributes {
    children?: any;
    type?: AlertTypes;
}

export function Alert(props: AlertAttributes) {
    props = Object.assign({
        type: AlertTypes.Primary
    }, props);
    return <div className={`alert alert-${ props.type }`} role={"alert"}>
        { props.children }
    </div>;
}