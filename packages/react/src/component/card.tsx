import { h } from "preact";
// import "../../css/component/card.scss";

/**
 * Card
 * 
 * @component
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export let Card = ({ title, icon , children, ...props }: { title?: string, children?: any } & JSX.HTMLAttributes) => {
    props.className = "card " + ( props.className || "" );
    let elIcon = icon ? <span className="icon float-left">{ icon }</span> : null;
    return <div { ...props }>
        { title ? <h2>{ elIcon }{ title }</h2> : null }
        { children }
    </div>;
};