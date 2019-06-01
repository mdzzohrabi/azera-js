export namespace Decorator {

    export enum Type {
        ConstructorParameter = 'CTOR_PARAM',
        MethodParameter = 'METHOD_PARAM',
        Method = 'METHOD',
        Property = 'PROP',
        Class = 'CLASS'
    }

    export function getType(target: any, key: string | symbol, index: number): Type {
        if ( !!key ) {
            if ( index >= 0 ) return Type.MethodParameter;
            else return ( typeof target[key] == 'function' ?  Type.Method : Type.Property );
        } else {
            if ( index >= 0 ) return Type.ConstructorParameter;
            return Type.Class;
        }
    }

}