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
    middlewares: (MiddlewareItem | Function)[];
    methodMiddlewares: { [name: string]: Function[] };
}

/**
 * Middleware decorator
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 * @decorator
 */
export function Middleware(middlewares: Function[]): any
export function Middleware(path?: string): any
export function Middleware(path?: any): any
{
    return function middlewareDecorator(target: object | Function, methodName?: string | symbol, desc?: any) {

        // Class decorator ( Tag a class as middleware service )
        if ( typeof target == 'function' && !Array.isArray(path) ) {
            target.prototype.middlewarePath = path;
            Service({ tags: [ 'http.middleware' ] })( target );
            return;
        }

        if (Array.isArray(path)) {

            let items = (typeof target == 'function' ? target.prototype : target) as MiddlewaresCollection;
        
            if (!methodName) {
                let middles = items[MIDDLEWARES_PROPERTY] = items[MIDDLEWARES_PROPERTY] || [];
                path.forEach(middle => middles.push(middle));
            } else {
                let middles = items.methodMiddlewares = items.methodMiddlewares || {};
                middles[String(methodName)] = path;
            }

        } else {
        
            let items = target as MiddlewaresCollection;
            let middles = items[MIDDLEWARES_PROPERTY] = items[MIDDLEWARES_PROPERTY] || [];
    
            // Method decorator ( Controller method as middleware )
            if (!methodName) throw TypeError(`Method name not specified for middleware ${ target.constructor.name }`);

            // Add middleware to middlewares property
            middles.push({
                methodName,
                path: path || ''
            });

        }

    }
}