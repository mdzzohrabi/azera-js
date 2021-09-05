import { is } from "@azera/util";
import "reflect-metadata";
import { META_PARAMETERS_INJECT } from "./constants";
import { Container } from "./container";
import { IArgumentConverterFunction, ServiceDefinition } from "./types";
import { Decorator, extendServiceDefinition, getServiceDefinition, getParameterServiceOrThrow, IPropertyInjectionOptions, isInternalClass, optimizeServiceType, setServiceDefinition } from './util';
let { Type } = Decorator;

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
                let def = getServiceDefinition(target);
                if ( !is.Array(def.methods[key]) ) def.methods[key] = [];
                def.methods[key][index] = service;
                break;
            case Type.Method:
                if ( Reflect.hasMetadata("design:paramtypes", target, key) ) {
                    let def = getServiceDefinition(target);
                    let curDeps = def.methods[key] ?? [];

                    let types: Function[] = Reflect.getMetadata("design:paramtypes", target, key);
                    let endOfDep = false;
                    let deps = types.map((type, i) => {
                        if (curDeps[i]) return curDeps[i];
                        if ( isInternalClass(type) ) {
                            endOfDep = true;
                            return null;
                        }
                        if ( endOfDep ) throw Error(`Dependencies must come first in method ${target.constructor.name}.${key} method, param types : ${ types.map(t => t && t.name).join(', ') }`);
                        return type;
                    }).filter( dep => !!dep );
                                
                    //@ts-ignore
                    def.methods[key] = deps;
                }
                break;
            case Type.ConstructorParameter:
                Reflect.defineMetadata(META_PARAMETERS_INJECT, true, target);
                service = getParameterServiceOrThrow(service, target, key, index);
                getServiceDefinition(target).parameters[index] = service;
                break;
            case Type.Property:
                options = Object.assign({
                    lateBinding: true
                }, options);
    
                // use Property Type as Injected Service
                if (!service && Reflect.hasMetadata("design:type", target, key))
                    service = optimizeServiceType(Reflect.getMetadata("design:type", target, key), key);

                if (service instanceof Function && service.name == 'Function') service = key;
    
                getServiceDefinition(target).properties[key] = options ? Object.assign({ name: service }, options) : service;
                break;
            case Type.Class:
                setServiceDefinition(target, {
                    parameters: is.Array(service) ? service : [service]
                });
                break;
        }
    };
}

/**
 * Add to tags to service
 * 
 * @param tags Tags
 * @returns 
 */
export function Tag(...tags: string[]): ClassDecorator {
    return (target: Function) => {
        Service({ tags })( target );
    };
}

/**
 * Service decorator
 * 
 * @param definition Service configuration
 * @returns 
 */
export function Service(definition: Partial<ServiceDefinition> | string = {}): ClassDecorator {
    return (target: Function) => {
        if ( typeof definition === 'string' ) {
            definition = { name: definition };
        }
        Container.checkInheritance(target);
        extendServiceDefinition(target, definition);
    };
}

export function ParamConverter<T>(type: Function, converter: IArgumentConverterFunction<T>): ClassDecorator & MethodDecorator
export function ParamConverter<T>(converter: IArgumentConverterFunction<T>): ParameterDecorator
export function ParamConverter<T>(type: any, converter?: any): any
{
    return (target: any, methodName?: string, paramIndex?: number) => {
        if (typeof converter === 'undefined' && methodName && typeof paramIndex == 'number') {
            converter = type;
            type =  Reflect.getMetadata("design:paramtypes", target, methodName)[paramIndex];
        }

        Service({
            paramConverters: [
                { type, converter, methodName, paramIndex: typeof paramIndex == 'number' ? paramIndex : undefined }
            ]
        })(target);
    }
}