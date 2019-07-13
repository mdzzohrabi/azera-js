let isArray = Array.isArray;
let RegExpFunction = RegExp;
let toString = (value: any) => Object.prototype.toString.call(value);
let keys = (value: object) => Object.keys(value);

const CLASS_REGEX = /^class\s+/;

export enum LABEL {
    Object = '[object Object]',
    Array = '[object Array]',
    Number = '[object Number]',
    String = '[object String]',
    Function = '[object Function]',
    AsyncFunction = '[object AsyncFunction]',
    Arguments = '[object Arguments]',
    Undefined = '[object Undefined]'
}

export interface HashMap<V> { [name: string]: V; }

export namespace is {

    export let Undefined = (value: any): value is undefined => toString(value) == LABEL.Undefined

    export let Arguments = (value: any): value is IArguments => toString(value) == LABEL.Arguments

    export let Promise = <T>(value: Promise<T> | any): value is Promise<T> => value && value instanceof global.Promise;

    export let Empty = (value: any): value is any => !value || keys(value).length == 0;

    export let HashMap = <V>(value: any): value is HashMap<V> => toString(value) == LABEL.Object;

    export let Object = (value: any): value is object => typeof value === 'object';

    export let String = (value: any): value is string => typeof value == 'string';

    export let Function = (value: any): value is Function => typeof value === 'function';

    export let Async = (value: Function) => toString(value) == LABEL.AsyncFunction;

    export let Array = (value: any): value is Array<any> => isArray(value);

    export let InstanceOf = <T extends Function>(value: any, object: T): value is T => typeof value === 'object' && value instanceof object;

    export let RegExp = (value: any): value is RegExp => InstanceOf(value, RegExpFunction);

    export let Number = (value: any): value is number => typeof value == 'number';

    export let Newable = <T>(value: T): value is T & (new () => T) => is.Function(value) && !!value.prototype && value.constructor.name == 'Function';

    export let Class = <T>(value: T): value is T & (new () => T) => is.Function(value) && CLASS_REGEX.test(value.toString());

    export let ClassObject = <T extends any>(value: T): value is T & { constructor: Function; } => value.__proto__ && is.Function(value.constructor) && value.constructor.name !== 'Function';

    export let ArrayOf = <T> (value: any[], type: Function): value is T[] => {
        if ( !isArray(value) ) return false;
        let length = value.length;
        for (let i = 0; i < length; i++)
            if (!type(value[i])) return false;
        return true;
    };

}

export default is;