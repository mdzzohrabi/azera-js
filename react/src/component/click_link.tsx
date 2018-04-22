import { h } from "preact";

export function ClickLink(props: JSX.HTMLAttributes) {
    props.href = "javascript: void 0";
    props.className = "click-link " + props.className || '';
    return h('a', props);
}