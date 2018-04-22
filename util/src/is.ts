let isArray = Array.isArray;
let RegExpFunction = RegExp;
let toString = (value) => Object.prototype.toString.call(value);
let keys = (value) => Object.keys(value);

const CLASS_REGEX = /^class\s+/;

export enum LABEL {
    Object = '[object Object]',
    Array = '[object Array]',
    Number = '[object Number]',
    String = '[object String]',
    Function = '[object Function]',
    AsyncFunction = '[object AsyncFunction]'
}

export interface HashMap<V> { [name: string]: V; }

export namespace is {

    export let Promise = <T>(value: Promise<T> | any): value is Promise<T> => value && value instanceof global.Promise;

    export let Empty = (value): boolean => !value || keys(value).length == 0;

    export let HashMap = <V>(value): value is HashMap<V> => toString(value) == LABEL.Object;

    export let Object = (value): value is object => typeof value === 'object';

    export let String = (value): value is string => typeof value == 'string';

    export let Function = (value): value is Function => typeof value === 'function';

    export let Async = (value: Function) => toString(value) == LABEL.AsyncFunction;

    export let Array = (value): value is Array<any> => isArray(value);

    export let InstanceOf = <T extends Function>(value, object: T): value is T => typeof value === 'object' && value instanceof object;

    export let RegExp = (value): value is RegExp => InstanceOf(value, RegExpFunction);

    export let Number = (value): value is number => typeof value == 'number';

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