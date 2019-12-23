import { Url } from 'url';

export interface MessageTransportOptions extends Url {
    sendTypes?: Function[]
    receiveTypes?: Function[]
    name?: string
}
