export interface Iterator<V,K,R,C> {
    (this: C, value: V, key: K): R;
}

export function forEach <T, C>(items: T[], callback: Iterator<T, number, boolean | void, C>, thisContext?: C ): void {

    if ( Array.isArray(items) ) {
        let length = items.length;
        let result;
        for (let i = 0; i < length ; i++) {
            result = callback.call( thisContext, items[i], i );
            if ( result === false ) break;
        }
    }

}

export namespace Collection {

    export function Concat( ...arrays: any[][] ): any[] {
        if ( arrays.length == 0 ) return [];
        return [].concat( ...arrays );
    }

}