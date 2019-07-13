import { Service } from '@azera/container';
import { HttpBundle } from './HttpBundle';
import { RoutesCollection, HttpMethods, Route } from './Route';

export interface ControllerOptions {
    children?: Function[]
}

export interface DecoratedController extends RoutesCollection {
    controllerOptions: ControllerOptions
    routePrefix: string
}

/**
 * Controller decorator
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export function Controller(routePrefix?: string, options?: ControllerOptions) {
    return function controllerDecorator(controller: Function) {

        options = { children: [], ...options };

        options.children!.forEach(child => {

            child.prototype.routePrefix = routePrefix;
        child.prototype.parentController = controller;

        });

        (controller.prototype as DecoratedController).controllerOptions = options;

        if (routePrefix) controller.prototype.routePrefix = (controller.prototype.routePrefix || '') + routePrefix;
    
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

        // console.log(controller, controller.prototype);

    }
}
