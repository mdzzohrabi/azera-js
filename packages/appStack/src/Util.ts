import { existsSync } from 'fs';
import { dirname } from 'path';
import { is } from '@azera/util';

/**
 * Get node package directory
 * @param pkgName Package name
 */
export function getPackageDir(pkgName?: string) {
    let dir: string | undefined;

    if (!pkgName) dir = require.main?.filename;
    else dir = require.resolve(pkgName, { paths: require.main?.paths });

    while ( dir && !existsSync(dir + '/package.json') ) {
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
        let lastIndex = params.length - 1;
        let ErrorClass = typeof params[lastIndex] == 'function' ? params[lastIndex] : Error;
        let argIndex = 0;
        let message = format.replace(/%s/g, () => params[argIndex++]);
        let error = new ErrorClass(message);
        error.name = `Invariant violation`;
        throw error;
    }

}

/**
 * Return a humanized name of an object for debug output
 * ```
 * // Example
 * debugName(new Element()); // returns "Element"
 * debugName(12); // returns "Number(12)"
 * ```
 * @param value Object
 */
export function debugName(value: any) {
    if (typeof value == 'function') {
        return value.name;
    } else if (typeof value == 'object' && 'constructor' in value) {
        return value.constructor.name;
    } else if (typeof value == 'number') {
        return `Number(${value})`;
    } else {
        typeof value;
    }
}

/**
 * Enable source map for stack-trace
 */
export function enableSourceMap() {
    require('source-map-support').install();
}

function functionGenerator<T extends string, U = { [K in T]?: string }> (keys: T[]): (p: U) => U {
    return (p: U) => p
  }

  
/**
 * Convert array to object
 * ```
 * // Example
 * convertArrToObject([ { name: 'Ali', age: 21 } , { name: 'Reza', age: 30 } ], 'name', 'age');
 * // Output
 * // { Ali: 21, Reza: 30 }
 * ```
 */
export function convertArrToObject<
    OK extends string,
    OV extends string | number,
    O extends { [K in OK]: OV },
    RK extends OK,
    RV extends OK>(arr: O[], key: RK, value: RV): { [Q in O[RK]]?: O[RV] }

/**
 * Convert array to object
 * ```
 * // Example
 * convertArrToObject([ 'A', 'B' ], value => 'Hello ' + value);
 * // Output
 * // { A: 'Hello A', B: 'Hello B' }
 * ```
 */
export function convertArrToObject<T extends string, V>(arr: T[], value?: ((v: T) => V) | V): { [K in T]?: V }
export function convertArrToObject(arr: any[], key?: any, value?: any)
{
    invariant(Array.isArray(arr), 'Expected array by %s given', typeof arr);
    
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

/**
 * Flatten an nested object
 * ```
 * flatObject({
 *  http: { port: 9090  }
 * })
 * // Output
 * // { "http.port": 9090 }
 * ```
 */
export function flatObject(object: any, options?: { join?: string, flatArray?: boolean }) {
    invariant(is.HashMap(object) || is.Array(object), 'Only arrays and objects can be flatten but "%s" given', typeof object);

    let { join = '.', flatArray = true } = options ?? {};
    let result: {[key: string]: any} = {};

    function flat(value: any, node: string = '') {
        if (!is.HashMap(value) && (!flatArray || !is.Array(value))) return result[node] = value;
        for (let k in value) {
            flat((<any>value)[k], (node ? node + join : '') + k);
        }
    }

    flat(object);
    return result;
}