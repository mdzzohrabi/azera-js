import { Service } from '@azera/container';
import { Decorator } from '@azera/util';

/**
 * Controller middlewares property name
 */
export const MIDDLEWARES_PROPERTY = 'middlewares';

export interface MiddlewareItem {
    methodName: string | symbol
    path: string
}

export interface MiddlewaresCollection {
    middlewares: MiddlewareItem[];
}

/**
 * Middleware decorator
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 * @decorator
 */
export function Middleware(path?: string): any
{
    return function middlewareDecorator(target: object | Function, methodName?: string | symbol, desc?: any) {

        // Class decorator ( Tag a class as middleware service )
        if ( typeof target == 'function' ) {
            target.prototype.middlewarePath = path;
            Service({ tags: [ 'http.middleware' ] })( target );
            return;
        }

        // Method decorator ( Controller method as middleware )
        if (!methodName) throw TypeError(`Method name not specified for middleware ${ target.constructor.name }`);

        let items = target as MiddlewaresCollection;

        // Add middleware to middlewares property
        (items[MIDDLEWARES_PROPERTY] = items[MIDDLEWARES_PROPERTY] || []).push({
            methodName,
            path: path || ''
        });

    }
}