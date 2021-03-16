import { Request } from './Request';
import { Response } from './Response';
import { Event } from '../../event/EventManager';
import { IHttpConfigRouteObject, IHttpRouteHandlerObject } from './Types';


export const EVENT_HTTP_RESULT = 'http.result';
export const EVENT_HTTP_LISTEN = 'http.listen';
export const EVENT_HTTP_EXPRESS = 'http.expresss';
export const EVENT_HTTP_EXPRESS_INIT = 'http.expresss_init';
export const EVENT_HTTP_ERROR = 'http.error';
export const EVENT_HTTP_ACTION = 'http.action';
export const EVENT_CONFIGURE_ROUTE = 'http.configure_route';

export class HttpResultEvent extends Event {
    constructor (
        public controller: any,
        public action: string,
        public method: string,        
        public result: any,
        public request: Request,
        public response: Response,
        public next: Function
    ) { super() }
}

export class HttpErrorEvent extends Event {
    constructor (
        public error: Error,
        public request: Request,
        public response: Response,
        public next: Function
    ) { super() }
}

export class HttpActionEvent extends Event {
    constructor(
        public path: string,
        public method: string,
        public action: string,
        public controller: object,
        public handler: Function
    ) { super() }
}

export class HttpRouteConfigEvent extends Event {
    constructor(
        public config: IHttpConfigRouteObject,
        public route: IHttpRouteHandlerObject
    ) { super(); }
}