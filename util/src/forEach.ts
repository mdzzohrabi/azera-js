import { IMap, IIterator } from "./enumerable";

export function forEach <T>(items: IMap<T>, func: IIterator<string, T, void>);
export function forEach <T>(items: T[], func: IIterator<number, T, void>);
export function forEach (items, func)
{
    let isObject = (typeof items == 'object');
    let isArray = isObject && 'slice' in items;

    if ( !isObject && !isArray ) throw TypeError(`Items are not iterable`);

    if ( isArray ) {
        for ( let i = 0, length = items.length ; i < length ; i++ )
            func.call(func, items[i], i);
    } else {
        let keys = Object.keys(items);
        for (let i = 0, length = keys.length; i < length; i++)
            func.call(func, items[ keys[i] ], keys[i]);
    }
}

export default forEach;