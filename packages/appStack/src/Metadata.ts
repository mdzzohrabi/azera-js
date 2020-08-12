import { is } from '@azera/util';
import 'reflect-metadata';
import { invariant } from './Util';

let classMetas = new Map<Function, Map<string, any>>();
let propertiesMetas = new Map<Function, Map<string, Map<string, any>>>();

const META_CLASS = Symbol('meta:class');
const META_PROPS = Symbol('meta:props');
type ClassMetaMap = Map<string, any>;
type PropertyMetaMap = Map<string, Map<string, any>>;

export function getClassDecoratedProps(target: Function) {
    target = getTarget(target);
    invariant(is.Function(target), `Target must be a function or class`);
    return ((target as any)[META_PROPS] ?? new Map()) as PropertyMetaMap;
}

/**
 * Get metadata map for class or function
 * @param target Target Class or Function
 */
export function getMetaMap(target: Function, property?: string): Map<string, any> {
    target = getTarget(target);

    if (!is.Function(target)) throw TypeError(`Target must be a function or class`);

    if (property) {
        // Properties metas
        if (is.Undefined((target as any)[META_PROPS])) {
            let parent = Object.getPrototypeOf(target);
            let map = new Map();
            while (parent) {
                if (parent[META_PROPS]) map = new Map(parent[META_PROPS]);
                parent = Object.getPrototypeOf(parent);
            }
            (target as any)[META_PROPS] = map;
        }

        let propsMeta = (target as any)[META_PROPS] as PropertyMetaMap;

        if (!propsMeta.has(property)) {
            propsMeta.set(property, new Map());
        }

        return propsMeta.get(property) as Map<string, any>;
    }

    let classMeta = (target as any)[META_CLASS] as ClassMetaMap;
    if (is.Undefined(classMeta)) {
        let parent = Object.getPrototypeOf(target);
        let map = new Map();
        while (parent) {
            if (parent[META_CLASS]) map = new Map(parent[META_CLASS]);
            parent = Object.getPrototypeOf(parent);
        }
        classMeta = (target as any)[META_CLASS] = map;
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

export function hasMeta(key: string | Function, target: Function, property?: string) {
    key = typeof key == 'function' ? key.prototype.key as string : key;
    target = getTarget(target);
    if (property) {
        // @ts-ignore
        return target[META_PROPS] && target[META_PROPS].has(property) && target[META_PROPS].get(property).has(key);
    }
    // @ts-ignore
    return target[META_CLASS] && target[META_CLASS].has(key);
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