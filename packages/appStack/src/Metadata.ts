import { is } from '@azera/util';

let classMetas = new Map<Function, Map<string, any>>();
let propertiesMetas = new Map<Function, Map<string, Map<string, any>>>();

/**
 * Get metadata map for class or function
 * @param target Target Class or Function
 */
export function getMetaMap(target: Function, property?: string) {
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

export function getMeta<T>(key: string, target: Function, property?: string) {
    return getMetaMap(target, property).get(key);
}

export function setMeta<T>(key: string, value: T, target: Function, property?: string) {
    getMetaMap(target, property).set(key, value);
    return value;
}

export function createMetaDecorator(key: string, multi: boolean = true) {
    return function metaDecorator(value: any) {
        return (target: any, propName?: any, descriptor?: any) => {
            if (multi) pushMeta(key, value, target, propName);
            else setMeta(key, value, target, propName);
        }
    }
}
