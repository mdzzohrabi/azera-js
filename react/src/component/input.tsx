import { is, map } from "@azera/util";
import { IMap } from "@azera/util/enumerable";
import { h } from "preact";
import __ from "./translate";
// import {CKEditor} from "./ckeditor";

export type InputOptions = IMap<string> | string[];

export interface InputAttributes extends JSX.HTMLAttributes {
    label?: string;
    hint?: any;
    inputIcon?: string | JSX.Element;
    options?: InputOptions;
}

let counter = 0;

export function Input ({ label, hint, inputIcon, options, ...params }: InputAttributes) {

    params = Object.assign({
        id: 'input_' + (++counter),
        placeholder: label,
        type: 'text'
    }, params);

    params.placeholder = __(params.placeholder);

    let {id, type} = params;

    let inputTag: any = 'input';
    let children = undefined;

    switch (type) {
        case 'textarea':
            inputTag = 'textarea';
            break;
        case 'checkbox':
            if ( params.onInput )
                [ params.onChange, params.onInput ] = [ params.onInput, undefined ];
            params.checked = !!params.value;
            break;
        case 'select':
            if ( params.onInput )
                [ params.onChange, params.onInput ] = [ params.onInput, undefined ];
            inputTag = 'select';
            children = map( options as {} , (label: string, value: number|string) => {
                if ( is.Number(value) ) value = label as any;
                return <option value={value as any}>{ label }</option>;
            });
            break;
        // case 'ckeditor':
        //     inputTag = CKEditor;
    }

    return <div class={`input-container row input-${type} ${ inputIcon ? 'has-icon': '' } ${ params.className && params.className.toString().indexOf("ltr") >= 0 ? 'input-ltr' : '' }`}>
        { label ? <label class="col-3" for={ id }>{ __(label) }</label> : null }
        <span className="input col">
            { inputIcon ? (typeof inputIcon === 'string' ? <span className="icon">{ inputIcon }</span> : inputIcon) : null }
            { h(inputTag, params, children) }
        </span>
        { hint ? <span className={"input-hint col-2"}>{ (typeof hint === 'string') ? __(hint) : hint }</span> : null }
    </div>;
}