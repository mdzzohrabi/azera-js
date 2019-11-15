import { existsSync } from 'fs';
import { dirname } from 'path';

/**
 * Get node package directory
 * @param pkgName Package name
 */
export function getPackageDir(pkgName?: string) {
    let dir: string;
    if (!pkgName) dir = (<any>require.main).filename;
    else dir = require.resolve(pkgName, { paths: (<any>require.main).paths });

    while ( !existsSync(dir + '/package.json') ) {
        dir = dirname(dir);
    }

    return dir;
}

/**
 * Iterate over a collection async (series)
 * @param items Collection to iterate
 * @param _func Iterator
 */
export async function asyncEach<T>(items: T[], _func: (value: T) => any) {
    let len = items.length;
    for (let i = 0; i < len ; i++)
        await _func(items[i]);
}

/**
 * Execute jobs collection serialize
 * @param items Job collection
 */
export async function serialize(items: Function[]) {
    return await asyncEach(items, async func => await func());
}

/**
 * Set object property safe
 * @param obj Object
 * @param path Path
 * @param value Value
 */
export function setProperty(obj: any, path: string, value: any) {

    if (obj == undefined || obj == null) throw TypeError(`Cannot set property of undefined or null object`);

    let parts = path.split('.');
    let len = parts.length;
    let node = obj;
    for (let i = 0; i < len; i++) {
        if ( i + 1 == len ) {
            node[ parts[i] ] = value;
        } else {
            node = node[ parts[i] ] || ( node[parts[i]] = {} );
        }
    }
    return value;
}

/**
 * Get property value of an object safe
 * @param obj Object
 * @param path Path
 */
export function getProperty(obj: any, path: string) {

    if (obj == undefined || obj == null) throw TypeError(`Cannot read property of undefined or null object`);

    let parts = path.split('.');
    let len = parts.length;
    let node = obj;
    for (let i = 0; i < len && !!node; i++) {
        node = node[ parts[i] ];
    }
    return null;
}

/**
 * Assert an condition and throw error with formatted message if condition is not true
 * @param condition Condition to check
 * @param format Message format
 * @param params Message parameters
 */
export function invariant(condition: any, format: string, ...params: any[]) {

    if (!condition) {
        let argIndex = 0;
        let message = format.replace(/%s/g, () => params[argIndex++]);
        let error = new Error(message);
        error.name = `Invariant violation`;
        throw error;
    }

}

export function debugName(value: any) {
    if (typeof value == 'function') {
        return value.name;
    } else if (typeof value == 'object' && 'constructor' in value) {
        return value.constructor.name;
    } else {
        typeof value;
    }
}


export function enableSourceMap() {
    require('source-map-support').install();
}

function functionGenerator<T extends string, U = { [K in T]?: string }> (keys: T[]): (p: U) => U {
    return (p: U) => p
  }

export function convertArrToObject<
    OK extends string,
    OV extends string | number,
    O extends { [K in OK]: OV },
    RK extends OK,
    RV extends OK
>(arr: O[], key: RK, value: RV): { [Q in O[RK]]?: O[RV] }

export function convertArrToObject<T extends string, V>(arr: T[], value?: ((v: T) => V) | V): { [K in T]?: V }
export function convertArrToObject(arr: any[], key?: any, value?: any)
{
    if (!Array.isArray(arr)) throw Error(`Expected array but ${typeof arr} given`);
    
    let object = {} as any;

    arr.forEach(v => {
        if (typeof v == 'object') {
            object[ v[key!] ] = v[value!];
        } else {
            object[v] = typeof key == 'function' ? key(v) : key;
        }
    });
    
    return object;
}

export class Util {

    /**
     * Flatten an nested object
     * ```json
     * {
     *  "http": {
     *      "port": 9090
     *  }
     * }
     * ```
     * will be flatten as :
     * ```json
     * {
     *  "http.port": 9090
     * }
     * ```
     * @param object Object
     * @param join Join character
     */
    static flatObject(object: any, join: string = '.') {


    }

}