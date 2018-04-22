import { EventEmitter } from "events";
import { Component, h } from "preact";
import __ from "./translate";
// import "./toast.scss";


let events = new EventEmitter();
let Action = { ADD: 'TOAST.ADD', DELETE: 'TOAST.DELETE', UPDATE: 'TOAST.UPDATE' };
const DefaultContainer = "main";

/**
 * Toast component
 * @param {Toast} toast
 * @constructor
 * @Component
 */
export function Toast(toast: Toast & { index?: number }) {
    return <div class={`toast toast-${toast.container}`} style={`transform: translateY(calc( -110% * ${toast.index} ))`}>
        { toast.title ? <b className={"toast-title"}>{ toast.title }</b> : null }
        <p className={"toast-message"}>{ typeof toast.message =='string' ? __(toast.message) : toast.message }</p>
    </div>;
}

/**
 * Toast container component
 * @Component
 */
export class ToastContainer extends Component<{ name?: string }, { toasts: Toast[] }> {

    props: { name?: string } = { name: DefaultContainer };
    state = { toasts: [] };

    componentWillMount() {
        events.on(Action.ADD, this.newToastListener);
        events.on(Action.DELETE, this.removeToast);
        events.on(Action.UPDATE, this.forceUpdate.bind(this));
    }

    componentWillUnmount() {
        events.removeListener(Action.ADD, this.newToastListener);
        events.removeListener(Action.DELETE, this.removeToast);
        events.removeListener(Action.UPDATE, this.forceUpdate.bind(this));
    }

    removeToast = (toast: Toast) => {
        let { toasts } = this.state;
        let index = toasts.indexOf(toast);
        if ( index >= 0 ) {
            toasts.splice(index, 1);
            this.setState({ toasts });
        }
    }

    newToastListener = (toast: Toast) => {
        if ( toast.container == this.props.name ) {
            let { toasts } = this.state;
            toasts.push( toast );
            this.setState({ toasts });
            // Toast timeout
            if ( toast.timeout ) setTimeout(this.removeToast.bind(this, toast), toast.timeout);
        }
    }

    render() {
        if (this.state.toasts.length <= 0) return null;
        return <div class={"toast-container"}>
            { this.state.toasts.map( (toast, index) => {
                return h(Toast as any, Object.assign({ index } ,toast) );
            }) }
        </div>;
    }
}

let counter = 0;

export function makeToast(toast: string | IToastAttributes & { container?: string })
{

    if (typeof toast == 'string')
        toast = {message: toast};

    toast = Object.assign({
        container: DefaultContainer,
        timeout: undefined,
        id: "toast-" + (++counter)
    }, toast);
    events.emit(Action.ADD, toast);

    let ToastClass = {
        remove: () => events.emit(Action.DELETE, toast),
        message: (message) => ToastClass.set("message", message),
        set: (name: string, value) => {
            toast[name] = value;
            events.emit(Action.UPDATE);
            return ToastClass;
        },
        removeAfter: (delay: number) => {
            setTimeout(ToastClass.remove, delay);
        }
    };

    return ToastClass;
}

export function makeLoadingToast <T>(promise: Promise<T>): Promise<T> {
    if ( !(promise instanceof Promise) ) return;
    let toast = makeToast('Loading...');
    promise
        .then(value => { toast.remove(); return value; })
        .catch(err => {
            toast.message( err.message || err).removeAfter(5000);
            return err;
        });
    return promise;
}

// Interfaces
export interface IToastAttributes {
    title?: string;
    message?: string;
    buttons?: {
        name: string
        click: Function
    }[];
    timeout?: number;
}

export interface Toast extends IToastAttributes {
    container: string;
    id: string;
}