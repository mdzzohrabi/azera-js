let isArray = Array.isArray;
let RegExpFunction = RegExp;

export namespace is {

    export let String = (value): value is string => typeof value == 'string';

    export let Function = (value): value is Function => typeof value === 'function';

    export let Array = (value): value is Array<any> => isArray(value);

    export let InstanceOf = <T extends Function>(value, object: T): value is T => typeof value === 'object' && value instanceof object;

    export let RegExp = (value): value is RegExp => InstanceOf(value, RegExpFunction);

    export let Number = (value): value is number => typeof value == 'number';

    export let ArrayOf = <T> (value: any[], type: Function): value is T[] => {
        if ( !isArray(value) ) return false;
        let length = value.length;
        for (let i = 0; i < length; i++)
            if (!type(value[i])) return false;
        return true;
    };

}