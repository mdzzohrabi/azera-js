import { ClientRequest, IncomingMessage, ServerResponse } from "http";

export interface IRequestHandler extends Function {
    (...params): any;
}