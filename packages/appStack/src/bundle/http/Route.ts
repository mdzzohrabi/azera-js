export const ROUTES_PROPERTY = 'routes';

export type RouteMethods = 'get' | 'post' | 'put' | 'any' | 'delete' | 'options';

export interface RoutesCollection {
    routes: { 
        path: string,
        method: RouteMethods,
        action: string
    }[]
}

export function Route(path: string, method: RouteMethods = 'get'): MethodDecorator {
    return function routeDecorator(context, key, des) {

        if ( typeof key != 'string' ) throw TypeError('Action must be string not symbol');

        let collection = context as RoutesCollection;

        if (!collection.routes) collection.routes = [];

        // Push to routes collection
        collection.routes.push({
            path, method, action: key
        });

    }
}

export function Get(path: string): MethodDecorator {
    return Route(path, 'get');
}

export function Post(path: string): MethodDecorator {
    return Route(path, 'post');
}

export function Put(path: string): MethodDecorator {
    return Route(path, 'put');
}

export function Delete(path: string): MethodDecorator {
    return Route(path, 'delete');
}