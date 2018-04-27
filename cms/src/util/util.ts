import { is } from "./is";

export namespace util {

    export function asArray <T>(value, typeCheck = undefined, optional = true, error = `Type error`, defaults = undefined): T[] {
        if ( optional && !value ) return defaults as any;

        if ( typeCheck ) {
            if ( typeCheck(value) ) return [value];
            else if ( is.ArrayOf(value, typeCheck) ) return value as T[];
            throw TypeError(error + `, ${ typeof value } given`);
        }

        return Array.isArray(value) ? value : [value];
    }

    export function assertReturn(expression: boolean, value, message: string) {
        if ( !expression ) throw Error(message);
        return value;
    }

}