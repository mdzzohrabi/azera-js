import { ContainerInvokeOptions, Decorator, Inject } from '@azera/container';
import { getParameters } from '@azera/reflect';
import { RequestInputContext } from '..';
import { Request } from '../Request';
import { RouteMethods } from '../Types';
import { Check, createCheckValidatorByType } from './Validator';

export const ROUTES_PROPERTY = 'routes';

export let HttpMethods = [ 'get', 'post', 'put', 'delete', 'options', 'head' ];
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

export function RequestParam(name?: string, type: RequestInputContext = 'query') {
    return (...params: any[]) => {
        let [target, methodName, paramIndex] = params;
        if (Decorator.getType(target, methodName, paramIndex) != Decorator.Type.MethodParameter) {
            throw Error(`"RequestParam" decorator only allowed to method parameters`);
        }

        let _default: any = undefined;       
        
        if (!name) {
            name = getParameters( target[methodName] )[ paramIndex ];
        }
        
        if (!name) {
            throw Error(`Http request parameter decorator has no name for ${target.constructor.name}:${methodName} parameter ${paramIndex}`);
        }
        
        // Create validator
        let methodParamTypes: Function[] = Reflect.getMetadata("design:paramtypes", target, methodName);
        let paramType: Function | null = methodParamTypes && methodParamTypes[paramIndex];

        if (paramType) {
            Check(name, checker => createCheckValidatorByType(checker, paramType!!))(target, methodName);
        }

        // Inject request extractor dependency
        Inject(function requestProviderPrivateFactory(invokeOptions: ContainerInvokeOptions) {
            if (!invokeOptions.invokeArguments) throw Error(`Query decorator only allowed on Express action`);
            let req: Request = invokeOptions.invokeArguments[0];
            if (type in req) {
                return req[type][name!!] ?? _default;
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