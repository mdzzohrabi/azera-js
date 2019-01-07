import { is } from "./is";
import { IMap, IIterator } from "./enumerable";
import { forEach } from ".";

export interface IMapOptions {
    asObject: boolean;
}

export function map <T, R>(items: IMap<T>, func: IIterator<string, T, Promise<R>>, options?: IMapOptions): Promise<R[]>;
export function map <T, R>(items: T[], func: IIterator<number, T, Promise<R>>, options?: IMapOptions): Promise<R[]>;
export function map <T, R>(items: IMap<T>, func: IIterator<string, T, R>, options?: IMapOptions): R[];
export function map <T, R>(items: T[], func: IIterator<number, T, R>, options?: IMapOptions): R[];
export function map(items: any, func: any, options?: IMapOptions): any[] | Promise<any[]> | IMap<any>
{

    options = Object.assign({ asObject: false }, options);

    if ( options.asObject ) {
        let result: IMap<any> = {};
        forEach(items, (value, key) => result[key] = func(value, key));
        return result;
    }

    let result: any[] = [];
    forEach(items, (value, key) => {
        result.push( func(value, key) );
    });
    if ( is.Promise(result[0]) ) return Promise.all(result);
    return result;
}

export default map;