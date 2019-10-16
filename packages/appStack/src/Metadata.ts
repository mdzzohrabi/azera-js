import { is } from '@azera/util';

let classMetas = new Map<Function, Map<string, any>>();
let propertiesMetas = new Map<Function, Map<string, Map<string, any>>>();

/**
 * Get metadata map for class or function
 * @param target Target Class or Function
 */
export function getMetaMap(target: Function, property?: string) {
    target = getTarget(target);

    if (!is.Function(target)) new TypeError(`Target must be a function or class`);

    if (property) {
        let classProps = propertiesMetas.get(target);
        if (is.Undefined(classProps))
            propertiesMetas.set(target, classProps = new Map());

        let propMeta = classProps.get(property);
        if (is.Undefined(propMeta))
            classProps.set(property, propMeta = new Map());
        
        return propMeta;
    }

    let classMeta = classMetas.get(target);
    if (is.Undefined(classMeta))
        classMetas.set(target, classMeta = new Map());

    return classMeta;
}

export function pushMeta<T>(key: string, value: T, target: Function, property?: string) {
    let metas = getMetaMap(target, property);
    let values = metas.get(key) as T[];
    if (is.Undefined(values)) metas.set(key, [ value ]);
    else metas.set(key, values.concat(value));
    return value;
}

export function getMeta<T extends { valueType: any }>(key: T, target: Function, property?: string): ValueType<T> | ValueType<T>[] | undefined
export function getMeta<T>(key: string | Function, target: Function, property?: string): any
export function getMeta<T>(key: string | Function, target: Function, property?: string)
{
    key = typeof key == 'function' ? key.prototype.key as string : key;
    return getMetaMap(target, property).get(key);
}

export function hasMeta(key: string | Function, target: Function, property?: string) {
    key = typeof key == 'function' ? key.prototype.key as string : key;
    if (property) {
        return propertiesMetas.has(target) && propertiesMetas.get(target)!.has(property) && propertiesMetas.get(target)!.get(property)!.has(key);
    }
    return classMetas.has(target) && classMetas.get(target)!.has(key);
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


export function createMetaDecorator<T>(key: string, multi: boolean, classDecorator : false, propertyDecorator ?: true): Func<T, PropertyDecorator>
export function createMetaDecorator<T>(key: string, multi: boolean, classDecorator : true, propertyDecorator : false): Func<T, ClassDecorator>
export function createMetaDecorator<T>(key: string, multi?: boolean, classDecorator ?: true, propertyDecorator ?: true): Func<T, Function>
export function createMetaDecorator<T>(key: string, multi: boolean = true, classDecorator = true, propertyDecorator = true)
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

export function createDecorator<D extends (...args: any[]) => any, R = ReturnType<D>>(valueGetter: D, key: string, multi: boolean = true): Decorator<D, Function, R> {
    let decorator = function metaDecorator(...args: any[]) {
        return (target: any, propName?: any, descriptor?: any) => {

            target = getTarget(target);

            let value = valueGetter(...args);

            if (multi) pushMeta(key, value, target, propName);
            else setMeta(key, value, target, propName);
        }
    }
    decorator.prototype.key = key;
    return decorator as any;
}

export type ArgumentTypes<T> = T extends (... args: infer U ) => infer R ? U: never;
export type ReplaceReturnType<T, TNewReturn> = { (...a: ArgumentTypes<T>): TNewReturn };
export type Decorator<T, TNewReturn, R> = { (...a: ArgumentTypes<T>): TNewReturn, valueType: R };
export type ValueType<T> = T extends { valueType: infer R } ? R : any; 

export interface Func<T, R> {
    (value: T):  R
}