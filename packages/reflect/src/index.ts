import {is} from "@azera/util";

export const CLASS_REGEX = /class\b/;

const NO_NAME_CLASS_REGEX = /class\W*\{/;
const NO_NAME_FUNC_REGEX = /function\W*\(/;
const CLASS_PARAM_REGEX = /constructor\s*\(\s*((\w+)\s*\,\s*)+\s*\)/;
const PARAM_OFFSET_REGEX = /\(/;
const CLASS_PARAM_OFFSET_REGEX = /constructor\s*\(/;
const PARAM_SEPARATOR = /\s*\,\s*/;
const ASYNC_FUNC_REGEX = /^(async\s+)?function/;
const METHOD_FUNC_REGEX = /^[a-zA-Z_][0-9a-zA-Z_]*\(/;
const OBJECT_DESTRUCTOR_REGEX = /\{.*?\}/;

export interface IClass {
    new (...params: any[]): any;
}

export function isArrowFunction(func: Function) {
    let str = toString(func);
    return func instanceof Function && !func.prototype && !ASYNC_FUNC_REGEX.test( str ) && !isMethod(func);
}

export function isMethod(func: Function) {
    return typeof func === 'function' && METHOD_FUNC_REGEX.test( func.toString() )
}

export function isCallable(func: any): func is Function {
    return is.Function(func) && !is.Class(func);
}

/**
 * Check if a value is Class
 * @param value 
 * @deprecated Use @azera/util
 */
export function isClass(value: any): value is IClass { return is.Class(value) }

/**
 * Check if a value is function
 * @param value 
 * @deprecated Use @azera/util
 */
export function isFunction(value: any): value is Function { return is.Function(value); }

export function toString( value: string | Function ): string {
    return typeof value === 'function' ? value.toString() : value;
}

export function assertFunction(value: any) {
    if ( typeof value !== 'function' ) throw Error(`${ typeof value } is not a function`);
}

/**
 * Get parameters of function or a class
 * @param value Function or class
 */
export function getParameters(value: Function) {
    assertFunction(value);
    let string = toString(value);
    let isArrow = isArrowFunction(value);
    let isClass = string.startsWith('class ');
    let params = [];
    if ( isArrow ) {
        params = string.split('=>')[0].split('(').pop()!.replace(/[()]/g, '').trim().replace(OBJECT_DESTRUCTOR_REGEX, (s,i) => `p${i}`).split(PARAM_SEPARATOR);
    } else {
        let parts = string.replace(/\/\*.*?\*\//g, '').split( isClass ? CLASS_PARAM_OFFSET_REGEX : PARAM_OFFSET_REGEX );
        params = parts[1] ? parts[1].split(')')[0].replace(OBJECT_DESTRUCTOR_REGEX, (s,i) => `p${i}`).split(PARAM_SEPARATOR) : [];
    }

    return params
        .map( param => param.split('=')[0].trim() )
        .filter(param => param.length > 0)
}

/**
 * Reflect class or function
 * @param value Function or class to reflect
 */
export function reflect(value: Function) {
    if ( typeof value !== 'function' ) throw Error(`Reflection only allowed for Functions and Classes`);
    let toString = value.toString();
    let name = value.name;
    let isClass = CLASS_REGEX.test(toString);
    let isFunction = !isClass;
    let isAnonymous = isClass ? NO_NAME_CLASS_REGEX.test(toString) : NO_NAME_FUNC_REGEX.test(toString);
    let isArrow = isArrowFunction(value);
    let parameters = getParameters(value);

    return { name, isClass, isFunction, isAnonymous, isArrow, parameters, toString };
}

export function has(object: object, property: string | number | symbol): boolean {
    return object.hasOwnProperty(property);
}