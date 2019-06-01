import { Service } from '@azera/container';
import { HttpBundle } from './HttpBundle';

export interface ControllerOptions {
    children?: Function[]
}

export interface DecoratedController {
    controllerOptions: ControllerOptions
    routePrefix: string
}

/**
 * Controller decorator
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export function Controller(routePrefix?: string, options?: ControllerOptions): ClassDecorator {
    return function controllerDecorator(controller: Function) {

        options = { children: [], ...options };

        options.children!.forEach(child => {

            child.prototype.routePrefix = routePrefix;
            child.prototype.parentController = controller;

        });

        (controller.prototype as DecoratedController).controllerOptions = options;

        if (routePrefix) controller.prototype.routePrefix = (controller.prototype.routePrefix || '') + routePrefix;
    
        Service({ tags: [ HttpBundle.DI_TAG_CONTROLLER ], imports: options.children })( controller );
    }
}