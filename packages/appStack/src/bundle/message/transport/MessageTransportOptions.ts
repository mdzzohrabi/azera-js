import { URL } from 'url';

export interface MessageTransportOptions extends URL {
    sendTypes?: Function[]
    receiveTypes?: Function[]
    name?: string
}
