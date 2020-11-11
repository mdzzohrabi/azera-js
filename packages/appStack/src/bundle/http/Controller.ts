import { Service } from '@azera/container';
import { Constructor } from '@azera/util';
import { HttpBundle } from './HttpBundle';
import { HttpMethods, Route, RoutesCollection } from './Route';

export interface ControllerOptions {
    children?: Function[]
}

export interface DecoratedController extends RoutesCollection {
    controllerOptions: ControllerOptions
    routePrefix: string
}

export function isDecoratedController(_func: Function): _func is Constructor<DecoratedController> {
    return _func.prototype.controllerOptions !== undefined;
}

/**
 * Controller decorator
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export function Controller(routePrefix?: string, options?: ControllerOptions) {
    return function controllerDecorator(controller: Function) {

        options = { children: [], ...options };

        // Optimzie child controllers
        options.children!.forEach(child => {

            child.prototype.routePrefix = (routePrefix ?? '') + (child.prototype.routePrefix ?? '');
            child.prototype.parentController = controller;

        });

        // Store controller options to its prototype
        (controller.prototype as DecoratedController).controllerOptions = options;

        // Optimize controller route prefix
        if (routePrefix) controller.prototype.routePrefix = (controller.prototype.routePrefix || '') + routePrefix;
    
        // Define controller in service container
        Service({ tags: [ HttpBundle.DI_TAG_CONTROLLER ], imports: options.children })( controller );

        // Extract routes defined in method name
        Object
            .getOwnPropertyNames(controller.prototype)
            .filter(propName => {
                return ( propName.startsWith('/') || HttpMethods.includes( propName.split(' ')[0].toLowerCase() ) ) && typeof controller.prototype[propName] == 'function';
            })
            .map(methodName => {
                let [method, path] = methodName.split(' ');
                if (path == undefined) [method, path] = ['GET', method];
                return { method, path, methodName };
            })
            .forEach(route => {
                Route(route.path, route.method.toLowerCase() as any)(controller.prototype, route.methodName, {});
            })
        ;

    }
}
