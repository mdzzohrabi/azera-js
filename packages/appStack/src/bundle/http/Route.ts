import { Inject, Decorator } from '@azera/container';
import { ContainerInvokeOptions } from '@azera/container/build/container';
import { getParameters } from '@azera/reflect';

export const ROUTES_PROPERTY = 'routes';

export let HttpMethods = [ 'get', 'post', 'put', 'any', 'delete', 'options' ];
export type RouteMethods = 'get' | 'post' | 'put' | 'any' | 'delete' | 'options'

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

        // Make controller action injectable
        Inject()(...arguments);

        let collection = context as RoutesCollection;

        if (!collection.routes) collection.routes = [];

        // Push to routes collection
        collection.routes.push({
            path, method, action: key
        });

    }
}

export function Get(path: string = '/'): MethodDecorator {
    return Route(path, 'get');
}

export function Post(path: string = '/'): MethodDecorator {
    return Route(path, 'post');
}

export function Put(path: string = '/'): MethodDecorator {
    return Route(path, 'put');
}

export function Delete(path: string = '/'): MethodDecorator {
    return Route(path, 'delete');
}

export function RequestParam(name?: string, type: string = 'query') {
    return (...params: any[]) => {        
        if (Decorator.getType(params[0], params[1], params[2]) != Decorator.Type.MethodParameter) {
            throw Error(`Query decorator only allowed to method parameters`);
        }

        let _default: any = undefined;

        if (!name) {
            name = getParameters( params[0][params[1]] )[ params[2] ];
        }

        if (!name) {
            throw Error(`Http request parameter decorator has no name for ${params[0].constructor.name}:${params[1]} parameter ${params[2]}`);
        }
        
        Inject((invokeOptions: ContainerInvokeOptions) => {            
            if (!invokeOptions.invokeArguments) throw Error(`Query decorator only allowed on Express action`);
            let req = invokeOptions.invokeArguments[0];
            if (type in req) {
                return req[type][name as string] ?? _default;
            } 
            throw Error(`Query decorator only allowed on Express action (Required Request)`);
        })(...params);
    }
}

export function Query(name?: string) {
    return RequestParam(name, 'query');
}

export function Param(name?: string) {
    return RequestParam(name, 'params');
}

export function Body(name?: string) {
    return RequestParam(name, 'body');
}