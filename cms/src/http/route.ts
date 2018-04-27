import { IMiddleWare } from "./middleware";
import { is } from "../util/is";
import { Router } from "./router";
import { util } from "../util/util";
import { IRequestHandler } from "./interfaces";

export type RoutePattern = string | RegExp;
export type RouteHandlers = IRequestHandler | IRequestHandler[];
export type RouteMethods = string | string[];

/**
 * Route interface
 * @interface
 */
export interface IRoute {
    name?: string;
    pattern: RegExp;
    handlers?: IRequestHandler[];
    routers?: Router[];
    methods?: string[];
}

export function isRoute(value): value is IRoute {
    return 'pattern' in value && 'methods' in value;
}

export function patternToRegExp(pattern: string, prefix = false) {
    return new RegExp('^' + pattern + (prefix ? '' : '$'), 'i');
}

export interface IMakeRouteParameters {
    method?: string | string[];
    pattern: string | RegExp;
    controller?: IRequestHandler | IRequestHandler[];
    router?: Router | Router[];
}

export function makeRoute({ method, pattern, controller, router }: IMakeRouteParameters): IRoute {

    let
        methods = util.asArray<string>(method, is.String, true, `Method must be string or array of strings`),
        _pattern: RegExp = is.String(pattern) ? patternToRegExp(pattern, false) : util.assertReturn(is.RegExp(pattern), pattern, `Pattern must be string or RegExp`),
        handlers = util.asArray<IRequestHandler>(controller, is.Function, true, `Controller must be a function or array of functions`, []),
        routers = util.asArray<Router>(router, item => is.InstanceOf(item, Router), true, `Router must be a Router or array of Routers`, []);

    if (handlers.length == 0 && routers.length == 0) throw Error(`Route must have a controller or a router at least`);

    return { methods, pattern: _pattern, handlers, routers };
}

export function mergeRoutes(...routes: IRoute[]) {

    if (routes.length <= 0) throw Error(`No routes given`);

    let result: IRoute = routes[0];

    routes.slice(1).forEach(route => {
        result.methods = (result.methods || []).concat(route.methods || []);
        result.handlers = result.handlers.concat(route.handlers);
    });

    return result;
}