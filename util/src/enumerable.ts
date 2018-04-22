import { is } from ".";
import { HashMap } from "./is";

export interface IIterator<K,V,R> {
    (value: V, key: K): R;
}

export interface IMap<T> {
    [key: string]: T;
}

export enum Type { Array, HashMap }

// export class Queryable<T extends HashMap<V>|V[], K extends keyof T, V extends T[K]>
// {

//     // Value type
//     private isArray: boolean;
//     // Value
//     private value: T;

//     constructor(value: T)
//     {
//         if ( !(this.isArray = is.Array(value)) || is.HashMap(value) ) {
//             throw TypeError(`Queryable only works with array or object`);
//         }
//         this.value = Object.assign(value);
//     }

//     // Keys
//     keys(): K[] { return Object.keys(this.value) as any; }

//     // Values
//     values(): V[] { return Object.values(this.value); }
    
//     // First item
//     first(): T[K] {
//         if ( this.isArray ) return this.value[0];
//         return this.value[ this.keys()[0] ];
//     }

//     map(mapper: Iterator<K, V>) {

//     }

//     toArray() {
//         return this.value;
//     }

// }

// new Queryable([1,2,3]).first()
// new Queryable({ name: 'Alireza', age: 32 }).first()

// export function from <T>(value: HashMap<T>): Queryable<HashMap<T>, string, T>
// export function from <T>(value: T[]): Queryable<T[], number, T>
// {
//     return new Queryable(value);
// }

// from([1,2]).first()

// export function from <T>( value: T[] | HashMap<T> ) {
//     return new Queryable <T>(value);
// }

// from(details).select( detail => <s>{ de }</s> );