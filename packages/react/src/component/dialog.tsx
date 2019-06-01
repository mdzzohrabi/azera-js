import { map } from "@azera/util";
import { EventEmitter } from "events";
import { Component, h } from "preact";
import { Button, IButtonAttributes } from "./button";
// import "./dialog.scss";
import { Form, IFormData, IFormField } from "./form";
import __ from "./translate";

let events = new EventEmitter();
let defaultContainer = "main";

// Dialog state actions
enum Action { ADD = "add", DELETE = "delete", UPDATE = "update"}

export interface IButton { title?: string; click: Function; }
export interface IDialogButtons { [name: string]: IButtonAttributes; }
export interface IDialog { id?: string; title?: string; message: any; buttons?: IDialogButtons; position?: string; minWidth?: string | number; }

export interface IDialogClass {
    dialog: IDialog;
    set(name: string, value): this;
    message(message: string): this;
    close(): void;
}


/**
 * Dialog component
 * @Component
 */
export function Dialog(object: IDialogClass) {
    let {dialog} = object;

    let buttons;
    if ( dialog.buttons ) {
        buttons = <div className="buttons">
            { map(dialog.buttons, (button, name) => {
                return h(Button, button);
            }) }
        </div>;
    }

    return <div key={dialog.id} className={"dialog"} style={`min-width: ${ dialog.minWidth || 'auto' }`}>
        <div className={"dialog-title"}>
            { dialog.title ? <h1>{ __(dialog.title) }</h1> : null }
        </div>
        <div className="dialog-message">{ typeof dialog.message == 'function' ? h(dialog.message, {
            dialog: object
        }) : dialog.message }
        { buttons }</div>
    </div>;
}

export interface IDialogContainerProps { position?: string; }
export interface IDialogContainerState { dialogs: IDialogClass[]; }

/**
 * Dialog container component
 * @Component
 */
export class DialogContainer extends Component<IDialogContainerProps, IDialogContainerState> {

    props: IDialogContainerProps = { position: defaultContainer };
    state = { dialogs: [] };
    containerRef = null;

    componentWillMount() {
        // Register listeners
        events
            .on(Action.ADD, this.addDialog)
            .on(Action.DELETE, this.deleteDialog)
            .on(Action.UPDATE, this.forceUpdate.bind(this));
    }

    componentWillUnmount() {
        events
            .removeListener(Action.ADD, this.addDialog)
            .removeListener(Action.DELETE, this.deleteDialog)
            .removeListener(Action.UPDATE, this.forceUpdate);
    }

    addDialog = (dialog: IDialogClass) => {
        if ( dialog.dialog.position != this.props.position ) return;
        let {dialogs} = this.state;
        dialogs.push(dialog);
        this.setState({dialogs});
    }

    deleteDialog = (dialog: IDialogClass) => {
        let {dialogs} = this.state;
        let index = dialogs.indexOf(dialog);
        if (index>=0) {
            dialogs.splice(index, 1);
            this.setState({dialogs});
        }
    }

    closeDialog = (event: MouseEvent) => {
        if ( event.target == this.containerRef ) {
            let {dialogs} = this.state;
            dialogs.pop();
            this.setState({dialogs});
        }
    }

    render() {
        let { position } = this.props;
        if ( this.state.dialogs.length <= 0 ) return null;
        return <div ref={div => this.containerRef = div} className={`dialog-container ${position}`} onClick={this.closeDialog}>
            { this.state.dialogs.map( dialog => h(Dialog, dialog) ) }
        </div>;
    }
}

let counter = 0;
export function newDialog(dialog: IDialog) {

    dialog = Object.assign({
        position: defaultContainer,
        id: `dialog-${ counter++ }`
    }, dialog);

    let DialogClass: IDialogClass;

    DialogClass = {
        dialog: dialog,
        message: (message) => this.set('message', message),
        set: (name, value) => {
            dialog[name] = value;
            events.emit(Action.UPDATE, DialogClass);
            return DialogClass;
        },
        close: () => {
            events.emit(Action.DELETE, DialogClass);
        }
    };

    events.emit(Action.ADD, DialogClass);

    return DialogClass;
}


interface IPromptField<T extends string> extends IFormField {
    name: T;
}

export function OkPrompt(title: string, message: string) {
    return new Promise((ok, fail) => {
        let dialog = newDialog({
            message: __(message),
            title: title,
            buttons: {
                ok: {
                    children: __('OK'),
                    icon: 'subdirectory_arrow_left',
                    onClick: () => {
                        dialog.close();
                        ok();
                    }
                },
                cancel: {
                    class: 'silver',
                    type: 'button',
                    children: __('Cancel'),
                    icon: 'cancel',
                    onClick: () => {
                        dialog.close();
                    }
                }
            }
        });
    });
}

export function Prompt <T>(title: string, form: IFormField[], data?: IFormData): Promise<IDialogClass & { formData: T & IFormData }> {
    return new Promise((done, fail) => {

        let dialog: IDialogClass;

        let submitForm = ( formData ) => {
            done(Object.create(dialog, { formData: { value: formData } }));
        };

        dialog = newDialog({
            title: title,
            minWidth: '30%',
            message: <div className="inputs-flex" >
                <Form fields={ form } onSubmit={ submitForm } data={ data } linear={true} buttons={[
                    { type: 'button', name: 'Cancel', onClick: () => dialog.close(), icon: 'cancel', className: 'silver' }
                ]}/>
            </div>
        });

    });
}