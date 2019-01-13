import { is } from "@azera/util";
import "reflect-metadata";
import { Container, Definition, getDependencies, isFactory, SERVICE_REGEX, isInternalClass } from "./container";
import { DecoratorError } from './errors';
import { IDefinition, IInternalDefinition } from "./types";
import { Decorator } from './util';
let { Type } = Decorator;


export const META_INJECT = Symbol('container.inject');
export const META_PARAMETERS_INJECT = Symbol('container.constructor.inject');

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
    //@ts-ignore
    return !!getTarget(value)[ META_INJECT ];
}

export function emitTypes() {
    return (target: any, method: string) => null;
}

/**
 * Get default class definition
 * @param {Function} target 
 */
export function getInitialDefinition(target: Function, context?: any): IDefinition {

    let deps = Reflect.hasMetadata(META_PARAMETERS_INJECT, target) ? [] : getDependencies(target).deps;

    if (context) {
        if ( Reflect.hasMetadata("design:paramtypes", context, target.name) ) {
            Reflect.getMetadata("design:paramtypes", context, target.name);
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
        invoke: !is.Class(target) && !SERVICE_REGEX.test(target.name),
        calls: {},
        methods: {},
        imports: [],
        autoTags: []
    } as IInternalDefinition);
}

/**
 * Get decorated definition for a class or function
 */
export function getDefinition(value: any, context?: any): IDefinition {
    let target = getTarget(value);
    if ( Reflect.hasMetadata(META_INJECT, target) ) {
        return Reflect.getMetadata(META_INJECT, target);
    }

    let initial = getInitialDefinition(target, context);
    Reflect.defineMetadata(META_INJECT, initial, target);
    return initial;
    //@ts-ignore
    //return target[DEF] || ( target[DEF] = getInitialDefinition(target, context));
}

/**
 * set decorated definition for a class or function
 */
export function setDefinition(value: any, definition: Partial<IDefinition>): IDefinition {
    return extendDefinition(value, definition);
    // let target = getTarget(value);
    // return target[DEF] || ( target[DEF] = Definition(Object.assign({ name: target.name }, definition)) );
}

export function extendDefinition(value: any, definition: Partial<IDefinition>): IDefinition {
    let target = getTarget(value);
    let old = getDefinition(target);
    // Fix methods combine
    if ( definition.methods ) {
        definition.methods = Object.assign(old.methods, definition.methods);
    }
    //@ts-ignore
    return target[META_INJECT] = Definition( Object.assign( old, definition ) );
}

export interface IPropertyInjectionOptions {
    lateBinding?: boolean;
}

function optimizeServiceType(type: any, name: string) {
    if ( type == Array )
         return '$$' + name;
    else if ( type == String || type == Object || type == Number )
        return '$' + name;
    return type;
}

function getParameterServiceOrThrow(service: any, target: any, key: any, index: any) {
    if ( service ) return service;
    if ( Reflect.hasMetadata('design:paramtypes', target, key) ) {
        return optimizeServiceType( Reflect.getMetadata('design:paramtypes', target, key)[index], key );
    } else if ( !service ) {
        throw new DecoratorError(`Please specify service for parameter injection`, target, key, index);
    }
}

/**
 * Injection for class or property
 * 
 * @param service Service or services to inject
 * @param options Property injection options
 */
export function Inject(services: ( Function | string )[]): ClassDecorator;
export function Inject(service?: Function | string, options?: IPropertyInjectionOptions): any;//ClassDecorator | MethodDecorator | PropertyDecorator | ParameterDecorator;
export function Inject(service?: any, options?: any): any//ClassDecorator | MethodDecorator | PropertyDecorator | ParameterDecorator
{
    return (target: any, key: any, index: any) => {
        let type = Decorator.getType(target, key, index);

        switch (type) {
            case Type.MethodParameter:
                service  = getParameterServiceOrThrow(service, target, key, index);
                let def = getDefinition(target);
                if ( !is.Array(def.methods[key]) ) def.methods[key] = [];
                def.methods[key][index] = service;
                break;
            case Type.Method:
                // throw new DecoratorError(`Decorate ${ type } not allowed`, target, key, index);

                if ( Reflect.hasMetadata("design:paramtypes", target, key) ) {
                    let types: Function[] = Reflect.getMetadata("design:paramtypes", target, key);
                    let endOfDep = false;
                    let deps = types.map((type, i) => {
                        if ( isInternalClass(type) ) {
                            endOfDep = true;
                            return null;
                        }
                        if ( endOfDep ) throw Error(`Dependencies must come first in method ${target.constructor.name}${key}`);
                        return type;
                    }).filter( dep => !!dep );

                    //@ts-ignore
                    getDefinition(target).methods[key] = deps;
                }

                break;
            case Type.ConstructorParameter:
                Reflect.defineMetadata(META_PARAMETERS_INJECT, true, target);
                service = getParameterServiceOrThrow(service, target, key, index);
                getDefinition(target).parameters[index] = service;
                break;
            case Type.Property:
                options = Object.assign({
                    lateBinding: true
                }, options);
    
                if ( !service && Reflect.hasMetadata("design:type", target, key) )
                    service = optimizeServiceType( Reflect.getMetadata("design:type", target, key), key );

                if ( service instanceof Function && service.name == 'Function' ) service = key;
    
                getDefinition(target).properties[key] = options ? Object.assign({ name: service }, options) : service;
                break;
            case Type.Class:
                setDefinition(target, {
                    parameters: is.Array(service) ? service : [service]
                });
                break;
        }
    };
}

export function Tag(...tags: string[]): ClassDecorator {
    return target => {
        Service({ tags })( target );
    };
}

export function Service(definition: Partial<IDefinition> | string = {}): ClassDecorator {
    return target => {

        if ( typeof definition === 'string' ) {
            definition = { name: definition };
        }

        // Check inheritance
        Container.checkInheritance(target);

        extendDefinition(target, definition);
    };
}