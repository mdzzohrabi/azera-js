import { IRoute, isRoute, RoutePattern, RouteMethods, RouteHandlers, makeRoute, mergeRoutes, patternToRegExp } from "./route";
import { ok } from "assert";
import { is } from "../util/is";
import { forEach, Collection } from "../util/collection";
import * as debugHandler from "debug";
import { IRequestHandler } from "./interfaces";

let debug = debugHandler(`router`);
let isPattern = value => is.String(value) || is.RegExp(value);
let isMethod = value => is.String(value) || is.ArrayOf<string>(value, is.String);

export let isRouter = (value): value is Router => is.InstanceOf(value, Router);

export type RouterController = Function | Router;

export class Router {

    // Router routes collection
    private routes: IRoute[] = new Array;
    private hashMap: { [pattern: string]: IRoute } = {};
    private routeCache: { [path: string]: IRequestHandler[] } = {};

    private mergeOrAdd(route: IRoute) {
        let { hashMap, routes } = this;
        let hashKey = route.pattern.source;

        if ( hashMap[hashKey] ) hashMap[hashKey] = mergeRoutes(hashMap[hashKey], route);
        else routes.push(hashMap[hashKey] = route);
    }

    private bindRouter(prefix: string, ...routers: Router[]): this {

        let pattern = patternToRegExp(prefix, true);
        this.mergeOrAdd( makeRoute({ pattern, router: routers }) );

        return this;
    }

    // Add route to router
    add(route: IRoute): this;
    add(pattern: string | RegExp, ...controller: RouterController[]): this;
    add(method: string | string[], pattern: string  | RegExp, ...controller: RouterController[]): this;
    add(...params): this
    {
        let route: IRoute;

        switch (params.length) {
            case 0: throw TypeError(`Arguments is not valid`);
            case 1:
                // Route
                ok(isRoute(route = params[0]), `route is not a valid Route object`);
        }

        let method, pattern, controllers: RouterController[];

        if ( isPattern(params[1]) && isMethod(params[0]) ) {
            [method, pattern] = params;
            params.splice(0,2);
        } else if ( isPattern(params[0]) ) {
            [pattern] = params;
            params.splice(0,1);
        }

        controllers = params;

        let routers: Router[] = [];
        controllers = controllers.filter(controller => {
            if ( isRouter(controller) ) {
                routers.push(controller);
                return false;
            }
            return true;
        });

        if ( routers.length > 0 ) this.bindRouter(pattern, ...routers);

        if ( controllers.length > 0 ) {
            this.mergeOrAdd(makeRoute({ method, pattern, controller: controllers as IRequestHandler[] }));
        }

        return this;
    }

    private matchRoute(route: IRoute, path: string, method?: string) {
        let matchMethod = (!method || !route.methods || route.methods.includes(method));

        if ( !matchMethod ) return null;

        let matchPath = route.pattern.exec(path);

        if ( matchPath ) return {
            matched: matchPath[0],
            route: route
        };

        return null;
    }

    handle(request: Request) {
    }

    // Matching routes
    match(path: string, method?: string): IRequestHandler[]
    {
        let handlers: IRequestHandler[] = [];
        let result: { matched: string, route: IRoute };

        forEach(this.routes, route => !(result = this.matchRoute(route, path, method)) );

        if ( result ) {
            handlers = handlers.concat(result.route.handlers || []);
            if ( result.route.routers ) {
                let subPath = path.substr(result.matched.length);
                result.route.routers.forEach(router => {
                    handlers = handlers.concat( router.match( subPath, method ) );
                });
            }
        }

        debug(`Match ${ path } -> ${ handlers.length + ' handlers' || 'not found' }`);
        return handlers;
    }

    get length() { return this.routes.length; }

}

export function makeRouter(): Router { return new Router; }