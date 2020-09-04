import { is } from '@azera/util';
import 'reflect-metadata';
import { invariant, deepClone } from './Util';

let classMetas = new Map<Function, ClassMetaMap>();
let propertiesMetas = new Map<Function, PropertyMetaMap>();

type ClassMetaMap = Map<string, any>;
type PropertyMetaMap = Map<string, Map<string, any>>;

export function getClassDecoratedProps(target: Function): PropertyMetaMap {
    getMetaMap(target, '');
    return propertiesMetas.get(getTarget(target)) ?? new Map();
}

/**
 * Get metadata map for class or function
 * @param target Target Class or Function
 */
export function getMetaMap(target: Function, property?: string): Map<string, any>
export function getMetaMap(target: Function, property: string | undefined, init: false): Map<string, any> | undefined
export function getMetaMap(target: Function, property?: string, init: boolean = true): any
{
    let baseTarget = getTarget(target);

    invariant(is.Function(baseTarget), `Target must be a function or class`, TypeError);

    if (property) {

        if (!propertiesMetas.has(baseTarget)) {
            if (!init) return;

            let map = new Map();
            let parent = Object.getPrototypeOf(baseTarget);
            while (parent) {
                if (propertiesMetas.has(parent)) map = deepClone(propertiesMetas.get(parent)!);
                parent = Object.getPrototypeOf(parent);
            }
            propertiesMetas.set(baseTarget, map);
        }

        let propsMeta = propertiesMetas.get(baseTarget)!;
        // Properties metas
        if (!propsMeta.has(property) && init) {
            propsMeta.set(property, new Map());
        }

        return propsMeta.get(property);
    }

    let classMeta = classMetas.get(baseTarget);

    if (is.Undefined(classMeta) && init) {
        let map = new Map();
        
        // Inherit parent metas
        let parent = Object.getPrototypeOf(baseTarget);
        while (parent) {
            if (classMetas.has(parent)) {
                map = deepClone(classMetas.get(parent)!);
            }
            parent = Object.getPrototypeOf(parent);
        }

        classMetas.set(baseTarget, map);

        return map;
    }

    return classMeta;
}

export function pushMeta<T>(key: string, value: T, target: Function, property?: string) {
    let metas = getMetaMap(target, property);
    let values = metas.get(key) as T[];
    if (is.Undefined(values)) metas.set(key, [ value ]);
    else metas.set(key, values.concat(value));
    return value;
}

export function getMeta<T extends Decorator<any, any, any, true>>(key: T, target: Function, property?: string): ValueType<T>[] | undefined
export function getMeta<T extends Decorator<any, any, any, false>>(key: T, target: Function, property?: string): ValueType<T> | undefined
export function getMeta<T>(key: string | Function, target: Function, property?: string): any
export function getMeta<T>(key: string | Function, target: Function, property?: string)
{
    key = typeof key == 'function' ? key.prototype.key as string : key;
    return getMetaMap(target, property).get(key);
}

export function hasMeta(key: string | Function, target: Function, property?: string): boolean {
    key = typeof key == 'function' ? key.prototype.key as string : key;
    return !!getMetaMap(target, property)?.has(key);
}


export function setMeta<T>(key: string | Function, value: T, target: Function, property?: string) {
    key = typeof key == 'function' ? key.prototype.key as string : key;
    getMetaMap(target, property).set(key, value);
    return value;
}

export function getTarget(value: any) {
    if (typeof value == 'function') return value;
    else if (typeof value == 'object' && 'constructor' in value) return value.constructor;
    else throw Error(`Metadata target must be a function`);
}


export function createMetaDecorator<T, M extends boolean>(key: string, multi: M, classDecorator : false, propertyDecorator ?: true): Decorator<(value: T) => T, PropertyDecorator, T, M>
export function createMetaDecorator<T, M extends boolean>(key: string, multi: M, classDecorator : true, propertyDecorator : false): Decorator<(value: T) => T, ClassDecorator, T, M>
export function createMetaDecorator<T, M extends boolean>(key: string, multi?: M, classDecorator ?: true, propertyDecorator ?: true): Decorator<(value: T) => T, any, T, M>
export function createMetaDecorator<T, M extends boolean>(key: string, multi = true, classDecorator = true, propertyDecorator = true)
{
    let decorator = function metaDecorator(value: T) {
        return (target: any, propName?: any, descriptor?: any) => {

            target = getTarget(target);

            if (multi) pushMeta(key, value, target, propName);
            else setMeta(key, value, target, propName);
        }
    }

    decorator.prototype.key = key;

    return decorator;
}

export function createDecorator<D extends DecoratorValueExtractor, M extends boolean, R = ReturnType<D>>(valueGetter: D, key: string, multi: M | true = true): Decorator<D, Function, R, M>
{
    let decorator = function metaDecorator(...args: any[]) {
        return (target: any, propName?: any, descriptor?: any) => {
            let propType = propName ? Reflect.getMetadata('design:type', target, propName) : undefined;
            let returnType = propName ? Reflect.getMetadata('design:returntype', target, propName) : undefined;
            let paramTypes = propName ? Reflect.getMetadata('design:paramtypes', target, propName) : undefined;

            target = getTarget(target);

            let value = valueGetter.call({ returnType, propType, propName, paramTypes, target }, ...args);

            if (multi) pushMeta(key, value, target, propName);
            else setMeta(key, value, target, propName);
        }
    }
    decorator.prototype.key = key;
    return decorator as any;
}

export type ArgumentTypes<T> = T extends (... args: infer U ) => infer R ? U: never;
export type ReplaceReturnType<T, TNewReturn> = { (...a: ArgumentTypes<T>): TNewReturn };
export type Decorator<T, TNewReturn, R, M extends boolean = true> = { (...a: ArgumentTypes<T>): TNewReturn, valueType: R, multi: M };
export type ValueType<T> = T extends { valueType: infer R } ? R : any; 
export type IsMulti<T> = T extends { multi: infer R } ? R : false; 
export type DecoratorValueExtractor = (this: { returnType?: any, paramTypes?: any[], propType?: any, propName?: string, target: any }, ...args: any[]) => any

export interface Func<T, R> {
    (value: T):  R
}