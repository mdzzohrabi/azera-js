import { getParameters } from "@azera/reflect";
import { is } from "@azera/util";
import { FACTORY_REGEX, META_INJECT, META_PARAMETERS_INJECT, SERVICE_REGEX } from "./constants";
import { DecoratorError } from "./errors";
import { Injectable, IMethod, Factory, IInternalDefinition } from "./types";
import { ServiceDefinition } from "./serviceDefinition";
import { ServiceType } from "./types";

export namespace Decorator {

    export enum Type {
        ConstructorParameter = 'CTOR_PARAM',
        MethodParameter = 'METHOD_PARAM',
        Method = 'METHOD',
        Property = 'PROP',
        Class = 'CLASS'
    }

    export function getType(target: any, key: string, index: number): Type {
        if ( !!key ) {
            if ( index >= 0 ) return Type.MethodParameter;
            else return ( typeof target[key] == 'function' ?  Type.Method : Type.Property );
        } else {
            if ( index >= 0 ) return Type.ConstructorParameter;
            return Type.Class;
        }
    }

}

/**
 * Get injectable dependencies
 * @param value Injectable
 */
 export function getDependencies(value: Injectable | IMethod) {
    let deps = [];
    let func: Function;

    if ( isMethodInvoke(value) ) {

        func = value.context[ value.method ];
        deps = getParameters(func);

        if ( Reflect.hasMetadata("design:paramtypes", value.context, value.method) ) {
            let types = Reflect.getMetadata("design:paramtypes", value.context, value.method) as any[];
            deps = types.map( type => {

            });
        }

    } else if (typeof value === 'function') {
        func = value;
        deps = (<any>value)['$inject'] || ( hasServiceDefinition(value) && getServiceDefinition(value).parameters ) || ( getParameters(value, false).filter(p => !p.hasDefault && p.name.length > 0).map(p => p.name) );

    } else if (Array.isArray(value)) {
        
        func = value[value.length - 1] as Function;
        deps = value.slice(0, value.length - 1);
        if(typeof func !== 'function') throw Error(`Last element of array must be function`);

    } else {
        throw TypeError(`value of type ${ typeof value } is not injectable`);
    }

    return { deps, func };
}


/**
 * Create new container definition
 * @returns {ServiceDefinition}
 */
export function createServiceDefinition(definition: Partial<ServiceDefinition>): ServiceDefinition {
    if (typeof definition.name !== 'string') throw Error(`Service name must be string`);
    return Object.assign(new ServiceDefinition(), definition);
}

export function isFactory(value: any): value is Factory { return value instanceof Function && FACTORY_REGEX.test(value.name); }
export function isService(value: any): value is ServiceType { return value instanceof Function && !FACTORY_REGEX.test(value.name); }
export function isServiceDefinition(value: any): value is ServiceDefinition {
    return is.HashMap(value) && ('service' in value || 'factory' in value);
}

export function MethodInvoke (context: any, method: string) {
    return { context, method };
}

export function isMethodInvoke(value: any): value is IMethod {
    return typeof value == 'object' && 'context' in value && 'method' in value;
}

const internalClasses = [ Object, Function, Number, String, Boolean, undefined ];
export function isInternalClass(value: any) {
    return internalClasses.includes(value);
}


/**
 * Get a class constructor
 * @param {any} value
 */
 export function getTarget(value: any): FunctionConstructor {
    return value.constructor && (value.constructor == Function || is.Async(value)) ? value : value.constructor;
}

/**
 * Check if a function or class has definition property
 * @param {any} value Function or class to check
 */
export function hasServiceDefinition(value: any): boolean {
    return Reflect.hasMetadata(META_INJECT, getTarget(value));
}

export function emitTypes() {
    return (target: any, method: string) => null;
}

/**
 * Get default class definition
 * @param {Function} target 
 */
export function getInitialServiceDefinition(target: Function, context?: any): ServiceDefinition {

    let deps = Reflect.hasMetadata(META_PARAMETERS_INJECT, target) ? [] : getDependencies(target).deps;

    if (context) {
        if ( Reflect.hasMetadata("design:paramtypes", context, target.name) ) {
            Reflect.getMetadata("design:paramtypes", context, target.name);
        }
    }

    return createServiceDefinition({
        $target: target,
        service: target,
        name: target.name,
        parameters: deps,
        private: false,
        isFactory: isFactory(target),
        invoke: !is.Class(target) && !SERVICE_REGEX.test(target.name),
    } as Partial<IInternalDefinition>);
}

/**
 * Get decorated definition for a class or function
 */
export function getServiceDefinition(value: any, context?: any): ServiceDefinition {
    let target = getTarget(value);
    if ( Reflect.hasMetadata(META_INJECT, target) ) {
        return Reflect.getMetadata(META_INJECT, target);
    }

    let initial = getInitialServiceDefinition(target, context);
    Reflect.defineMetadata(META_INJECT, initial, target);
    return initial;
}

/**
 * set decorated definition for a class or function
 */
export function setServiceDefinition(value: any, definition: Partial<ServiceDefinition>): Partial<ServiceDefinition> {
    return extendServiceDefinition(value, definition);
}

export function extendServiceDefinition(value: any, definition: Partial<ServiceDefinition>): Partial<ServiceDefinition> {
    let target = getTarget(value);
    let old = getServiceDefinition(target);
    // Fix methods combine
    if ( definition.methods ) {
        definition.methods = Object.assign(old.methods, definition.methods);
    }

    // Merge Tags
    if ( definition.tags ) {
        definition.tags = [ ...old.tags, ...definition.tags ];
    }

    if (definition.paramConverters) {
        definition.paramConverters = definition.paramConverters.concat( old.paramConverters ?? [] );
    }

    definition = createServiceDefinition( Object.assign( old, definition ) );
    
    Reflect.defineMetadata(META_INJECT, definition, target);
    return definition;
}

export interface IPropertyInjectionOptions {
    lateBinding?: boolean;
}

/**
 * Optimize service name based on name and type of service
 * 
 * @param type Type
 * @param name Property/parameter name
 * @returns 
 */
export function optimizeServiceType(type: any, name: string) {
    // Tag injection
    if ( type == Array )
        return '$$' + name;
    // Parameter injection
    else if ( type == String || type == Object || type == Number )
        return '$' + name;
    // Service injection
    return type;
}

export function getParameterServiceOrThrow(service: any, target: any, key: any, index: any) {
    if ( service ) return service;
    if ( Reflect.hasMetadata('design:paramtypes', target, key) ) {
        return optimizeServiceType( Reflect.getMetadata('design:paramtypes', target, key)[index], key );
    } else if ( !service ) {
        throw new DecoratorError(`Please specify service for parameter injection`, target, key, index);
    }
}