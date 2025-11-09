import type { DecoratorKind, Kinds, MemberName } from "./types";

export interface ParamInfo {
  name: string;
  defaultValue?: string;
}

export function getParamsInfo<T extends (...args: any[]) => any>(
  fn: T | Function
): ParamInfo[] {
  const str = fn
    .toString()
    .replace(/[/][/].*$/mg, '')         // remove single-line comments
    .replace(/[/][*][^/*]*[*][/]/g, '') // remove block comments
    .replace(/\r?\n|\r/g, '')           // remove newlines
    .replace(/\s+/g, '');               // remove spaces

  // Match: function, method, arrow, or constructor
  const match =
    str.match(/^[^(]*\(([^)]*)\)/) ||
    str.match(/\(([^)]*)\)\s*=>/) ||
    str.match(/constructor\(([^)]*)\)/);

  if (!match) return [];

  const params = match[1]
    ?.split(',')
    .map(p => p.trim())
    .filter(Boolean) ?? [];

  return params.map(param => {
    const [name, defaultValue] = param.split('=');
    return {
      name: String(name),
      defaultValue: defaultValue ?? undefined,
    };
  });
}


/**
 * Get decorator kind
 */
export function GetDecoratorKind<A extends Function | object, B extends MemberName, C>(target?: A, name?: B, descriptor?: C): DecoratorKind<A, B, C> {

    let kind: DecoratorKind<A, B, C> = undefined as any;

    const [type1, type2, type3] = [typeof target, typeof name, typeof descriptor];

    if (type1 !== 'object' && type1 !== 'function')
        throw TypeError(`Invalid decorator injection`);

    // Class
    if (type1 == 'function' && type2 == 'undefined' && type3 == 'undefined')
        kind = 'class' as DecoratorKind<A, B, C>;

    // Method
    else if (type3 == 'object')
        kind = 'method' as DecoratorKind<A, B, C>;

    // Parameter
    else if (type3 == 'number')
        kind = 'parameter' as DecoratorKind<A, B, C>;

    // Property
    else
        kind = 'property' as DecoratorKind<A, B, C>;

    if (!kind)
        throw TypeError(`Cannot detect decorator kind for ${target}${name ? '.' + String(name) : ''}`);

    return kind;
}


export function attributeDataType(kind: Kinds, target: any, propName?: any, paramIndex?: number) {
    if (typeof paramIndex == 'number') {
        const types = Reflect.getMetadata('design:paramtypes', target, propName);
        // console.log({types, target, propName, paramIndex, fn: target[propName]});
        return types[paramIndex];
    }
    else if (typeof propName == 'string' || typeof propName == 'symbol') {
        const type = Reflect.getMetadata('design:type', target, propName);
        // console.log({ type, propName });
        return type;
    }
}

/**
 * Get decorator context
 * 
 * @returns Decorator context
 */
export function getParamInfo<A extends Function | object, B extends MemberName, C>(target?: A, name?: B, descriptor?: C): ParamInfo | undefined
{
    if (typeof descriptor == 'number' && target) {
        // Method
        if ( (typeof name == 'string' || typeof name == 'symbol') && typeof (target as any)[name] == 'function') {
            let paramNames = getParamsInfo((target as any)[name]);
            return paramNames[descriptor];
        }
        // Constructor
        else if (name === undefined) {
            let paramNames = getParamsInfo(target as any);
            return paramNames[descriptor];
        }
    }
}