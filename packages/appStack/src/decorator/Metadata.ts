import { is } from '@azera/util';
import 'reflect-metadata';
import { deepClone, invariant } from '../helper/Util';

type MetaMap<T = any> = Map<string, T>;
export const META_DATA = Symbol('meta-data');

class ClassMetaData {
    metas: MetaMap = new Map();
    properties: MetaMap<{ metas: MetaMap, parameters: MetaMap<MetaMap> }> = new Map();
}

export function getDecoratedParameters(target: Function, property: string): MetaMap<MetaMap> {
    let baseTarget = getMetadataTarget(target);
    let metaData: ClassMetaData = baseTarget[META_DATA];
    if (!metaData || !metaData.properties.has(property)) return new Map();
    return metaData.properties.get(property)!.parameters;
}

export function getClassDecoratedProps(target: Function): MetaMap<MetaMap> {
    let baseTarget = getMetadataTarget(target);
    let metaData: ClassMetaData = baseTarget[META_DATA];
    if (!metaData) return new Map();
    let result = new Map();
    for (let [name, prop] of metaData!.properties.entries()) {
        result.set(name, prop.metas);
    }
    
    return result;
}

export function hasMetaMap(target: Function, property?: string) {
    let baseTarget = getMetadataTarget(target);
    if (property) return baseTarget[META_DATA] && (baseTarget[META_DATA] as ClassMetaData).properties.has(property);
    return !!baseTarget[META_DATA];
}

/**
 * Get metadata map for class or function
 * @param target Target Class or Function
 */
export function getMetaMap(target: Function, property?: string, index?: number): MetaMap
export function getMetaMap(target: Function, property: string | undefined, index: number | undefined, init: false): MetaMap | undefined
export function getMetaMap(target: Function, property?: string, index?: number, init: boolean = true): MetaMap | undefined
{
    let baseTarget = getMetadataTarget(target);
    invariant(is.Function(baseTarget), `Target must be a function or class`, TypeError);
    let metaData: ClassMetaData = baseTarget[META_DATA];

    // Inheritance (Create a new copy of parent class meta-data)
    if (metaData && metaData == Object.getPrototypeOf(baseTarget)[META_DATA]) {
        let parentMeta = metaData;
        Object.defineProperty(baseTarget, META_DATA, {
            configurable: false,
            enumerable: false,
            writable: false,
            value: new ClassMetaData
        })
        metaData = baseTarget[META_DATA];
        parentMeta.metas.forEach((v, k) => metaData.metas.set(k ,v));
        parentMeta.properties.forEach((v, k) => metaData.properties.set(k , deepClone(v)));
    }

    // Initialize class meta-data
    if (!metaData) {
        if (!init) return;
        Object.defineProperty(baseTarget, META_DATA, {
            value: new ClassMetaData,
            enumerable: false,
            configurable: false,
            writable: false
        });
        metaData = baseTarget[META_DATA];
    }

    // Prepare property meta-data
    if (property && !metaData.properties.has(property)) {
        metaData.properties.set(property, { metas: new Map, parameters: new Map });
    }

    // Get Parameter meta-data
    if (property && index !== undefined) {
        let propMeta = metaData.properties.get(property)!;
        if (!propMeta.parameters.has(String(index))) {
            propMeta.parameters.set(String(index), new Map);
        }
        return propMeta.parameters.get(String(index));
    }
    else if (property) {
        return metaData.properties.get(property)!.metas;
    }
    else {
        return metaData.metas;
    }
}

export function pushMeta<T>(key: string, value: T, target: Function, property?: string, index?: number) {
    let metas = getMetaMap(target, property, index);
    let values = metas.get(key) as T[];
    if (is.Undefined(values)) metas.set(key, [ value ]);
    else metas.set(key, values.concat(value));
    return value;
}

export function getMeta<T extends Decorator<any, any, any, true>>(key: T, target: Function, property?: string, index?: number): ValueType<T>[] | undefined
export function getMeta<T extends Decorator<any, any, any, false>>(key: T, target: Function, property?: string, index?: number): ValueType<T> | undefined
export function getMeta<T>(key: string | Function, target: Function, property?: string, index?: number): any
export function getMeta<T>(key: string | Function, target: Function, property?: string, index?: number)
{
    key = typeof key == 'function' ? key.prototype.key as string : key;
    return getMetaMap(target, property, index).get(key);
}

export function hasMeta(key: string | Function, target: Function, property?: string, index?: number): boolean {
    key = typeof key == 'function' ? key.prototype.key as string : key;
    return !!getMetaMap(target, property, index)?.has(key);
}


export function setMeta<T>(key: string | Function, value: T, target: Function, property?: string, index?: number) {
    key = typeof key == 'function' ? key.prototype.key as string : key;
    getMetaMap(target, property, index).set(key, value);
    return value;
}

export function getMetadataTarget(value: any) {
    if (typeof value == 'function') return value;
    else if (typeof value == 'object' && 'constructor' in value) return value.constructor;
    else throw Error(`Metadata target must be a function`);
}


export function createMetaDecorator<T extends undefined, M extends boolean>(key: string, multi?: M, classDecorator ?: boolean, propertyDecorator ?: boolean): Decorator<() => T, any, T, M>
export function createMetaDecorator<T, M extends boolean>(key: string, multi?: M, classDecorator ?: boolean, propertyDecorator ?: boolean): Decorator<(value: T) => T, any, T, M>
export function createMetaDecorator<T, M extends boolean>(key: string, multi = true, classDecorator = true, propertyDecorator = true)
{
    let decorator = function metaDecorator(value: T) {
        return (target: any, propName?: any, descriptor?: any) => {

            target = getMetadataTarget(target);

            if (multi) pushMeta(key, value, target, propName, typeof descriptor == 'number' ? descriptor : undefined);
            else setMeta(key, value, target, propName, typeof descriptor == 'number' ? descriptor : undefined);
        }
    }

    decorator.prototype.key = key;

    return decorator;
}

export function createDecorator<D extends DecoratorValueExtractor, M extends boolean, R = ReturnType<D>>(valueGetter: D, key: string, multi: M | true = true): Decorator<D, Function, R, M>
{
    let decorator = function metaDeorator (...args: any[]) {
        return {
        [valueGetter.name]: function (target: any, propName?: any, descriptor?: any) {
                let propType = propName ? Reflect.getMetadata('design:type', target, propName) : undefined;
                let returnType = propName ? Reflect.getMetadata('design:returntype', target, propName) : undefined;
                let paramTypes = propName ? Reflect.getMetadata('design:paramtypes', target, propName) : undefined;

                target = getMetadataTarget(target);

                let value = valueGetter.call({ returnType, propType, propName, paramTypes, target, descriptor: typeof descriptor == 'object' ? descriptor : undefined, index: typeof descriptor == 'number' ? descriptor: undefined }, ...args);

                if (multi) pushMeta(key, value, target, propName, typeof descriptor == 'number' ? descriptor : undefined);
                else setMeta(key, value, target, propName, typeof descriptor == 'number' ? descriptor : undefined);
            }
        }[valueGetter.name]
    };

    decorator.prototype.key = key;
    return decorator as any;
}

type ArgumentTypes<T> = T extends (... args: infer U ) => infer R ? U: never;
type ReplaceReturnType<T, TNewReturn> = { (...a: ArgumentTypes<T>): TNewReturn };
type Decorator<T, TNewReturn, R, M extends boolean = true> = { (...a: ArgumentTypes<T>): TNewReturn, valueType: R, multi: M };
type ValueType<T> = T extends { valueType: infer R } ? R : any; 
type IsMulti<T> = T extends { multi: infer R } ? R : false; 
type DecoratorValueExtractor = (this: { returnType?: any, paramTypes?: any[], propType?: any, propName?: string, target: any, index?: number, descriptor?: PropertyDescriptor }, ...args: any[]) => any

export interface Func<T, R> {
    (value: T):  R
}