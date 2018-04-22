import { is } from "@azera/util";
import { Container, Definition, getDependencies, isFactory } from "./container";
import { IDefinition, IInternalDefinition } from "./types";
import "reflect-metadata";

export const DEF = Symbol('definition');

/**
 * Get a class constructor
 * @param {any} value
 */
export function getTarget(value: any): FunctionConstructor {
    return value.prototype && value.prototype.constructor == value ? value : ( value.constructor == Function ? value : value.constructor );
}

/**
 * Check if a function or class has definition property
 * @param {Function} value Function or class to check
 */
export function hasDefinition(value: Function): boolean {
    return !!getTarget(value)[ DEF ];
}

export function emitTypes() {
    return (target, method) => null;
}

/**
 * Get default class definition
 * @param {Function} target 
 */
export function getInitialDefinition(target: Function, context?): IDefinition {

    let deps = getDependencies(target).deps;

    if (context) {
        if ( Reflect.hasMetadata("design:paramtypes", context, target.name) ) {
            let types = Reflect.getMetadata("design:paramtypes", context, target.name);
            
        }
    }


    return Definition({
        $target: target,
        service: target,
        name: target.name,
        properties: {},
        parameters: deps,
        private: false,
        tags: [],
        isFactory: isFactory(target),
        invoke: !is.Class(target)
    } as IInternalDefinition);
}

/**
 * Get decorated definition for a class or function
 */
export function getDefinition(value, context?): IDefinition {
    let target = getTarget(value);
    return target[DEF] || ( target[DEF] = getInitialDefinition(target, context) );
}

/**
 * set decorated definition for a class or function
 */
export function setDefinition(value, definition: IDefinition): IDefinition {
    return extendDefinition(value, definition);
    // let target = getTarget(value);
    // return target[DEF] || ( target[DEF] = Definition(Object.assign({ name: target.name }, definition)) );
}

export function extendDefinition(value, definition: IDefinition): IDefinition {
    let target = getTarget(value);
    return target[DEF] = Definition( Object.assign( getDefinition(target), definition ) );
}

export interface IPropertyInjectionOptions {
    lateBinding?: boolean;
}

function optimizeServiceType(type, name: string) {
    if ( type == Array )
         return '$$' + name;
    else if ( type == String || type == Object || type == Number )
        return '$' + name;
    return type;
}

/**
 * Injection for class or property
 * 
 * @param service Service or services to inject
 * @param options Property injection options
 */
export function Inject(services: ( Function | string )[]): ClassDecorator;
export function Inject(service?: Function | string, options?: IPropertyInjectionOptions);
export function Inject(service?, options?)
{
    return (target, key, index) => {

        // Property decorator
        if ( !key && index >= 0 ) {

            if ( !service ) {
                if ( Reflect.hasMetadata('design:paramtypes', target, key) ) {
                    service = optimizeServiceType( Reflect.getMetadata('design:paramtypes', target, key)[0], key );
                } else {
                    throw Error(`Please specify service for parameter injection`);
                }
            }

            getDefinition(target).parameters[index] = service;

        } else if ( key ) {

            if ( index ) throw Error(`Method parameter injection not supported.`);
            
            options = Object.assign({
                lateBinding: true
            }, options);

            if ( key && !service ) {
                // Property
                // console.log(target, key, index, service, Reflect.getMetadata("design:paramtypes", target,key));
                if ( Reflect.hasMetadata("design:type", target, key) )
                    service = optimizeServiceType( Reflect.getMetadata("design:type", target, key), key );
            }

            getDefinition(target).properties[key] = options ? Object.assign({ name: service }, options) : service;
        } else {
            // Class decorator
            setDefinition(target, {
                parameters: service
            });
            // target['$inject'] = service;
        }
    };
}

export function Tag(...tags: string[]): ClassDecorator {
    return target => {
        Service({ tags })( target );
    };
}

export function Service(definition: IDefinition | string): ClassDecorator {
    return target => {

        if ( typeof definition === 'string' ) {
            definition = { name: definition };
        }

        // Check inheritance
        Container.checkInheritance(target);

        extendDefinition(target, definition);
    };
}