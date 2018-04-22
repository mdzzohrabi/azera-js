import { h } from "preact";

export interface IButtonAttributes extends JSX.HTMLAttributes {
    icon?: string;
    children?: any;
}

export let Button = ({ icon, children, ...params }: IButtonAttributes ) => {
    return <button { ...params }>{ children } { icon ? <span className="icon float-left">{ icon }</span> : null }</button>;
};
