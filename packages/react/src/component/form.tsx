import { IMap } from "@azera/util/enumerable";
import { Component, h } from "preact";
import * as S from "string";
import { Button } from "./button";
import { Input, InputAttributes } from "./input";
import __ from "./translate";
//import S = require("string");
// import ReCaptcha from "preact-google-recaptcha";

export interface IFormField extends InputAttributes { name: string; }
export interface IButton extends JSX.HTMLAttributes{ name: string; }
export interface IFormData extends IMap<string> {}

export interface FormAttributes<T> {
    fields: IFormField[];
    buttons?: IButton[];
    onSubmit: (data: T) => void;
    data?: T;
    submitButton?: string;
    linear?: boolean;
    submitIcon?: string;
    submitClass?: string;
    label?: boolean;
    reCaptcha?: boolean;
}

export interface FormState<T> { data: T; }

export class Form<T extends any> extends Component<FormAttributes<T>, FormState<T>> {

    state = {
        data: {} as T
    };

    defaultProps = {
        label: true,
        submitIcon: 'subdirectory_arrow_left',
        submitButton: 'Submit',
        linear: false,
    };

    componentWillMount() {
        this.setState({ data: this.props.data || {} as any });
    }

    componentWillReceiveProps(props) {
        if ( props.data !== this.state.data ) {
            this.setState({ data: props.data || {} });
        }
    }

    onSubmit = (event: Event) => {
        event.preventDefault();
        this.props.onSubmit(this.state.data);
    }

    render() {

        let {submitButton, linear, submitIcon, submitClass, label, reCaptcha} = Object.assign(this.defaultProps, this.props);
        let buttons = [];

        if (submitButton)
            buttons.push( <Button type="submit" className={submitClass} icon={ submitIcon }>{ __(submitButton) }</Button> );

        // Buttons
        (this.props.buttons || []).forEach( button => {
            let params = Object.assign({}, button);
            delete params.name;
            buttons.push(<Button { ...params }>{ __(button.name) }</Button>);
        });

        return <form onSubmit={this.onSubmit}>
            { this.props.fields.map(field => {
                return h(Input, Object.assign({
                    label: field.label || S(field.name).humanize().toString(),
                    className: linear ? 'linear' : null,
                    value: this.state.data[field.name],
                    onInput: this.linkState(`data.${ field.name }`),
                }, field));
            }) }
            {/* { reCaptcha ? <ReCaptcha sitekey="6LfUptESAAAAANuimQwsQ0mnS4QHxnGP1f7DFT9i"/> : null } */}
            { buttons.length > 0 ? <div className="buttons">{ ...buttons }</div> : null }
        </form>;
    }
}