export interface IOptions {
    resolveParams?: boolean;
    parseDefaults?: boolean;
}

/**
 * Parse a function
 * @param func    Function
 * @param options Options
 * @deprecated Use @azera/reflect package instead
 */
export function parseFunction(func: Function, options: IOptions = {}) {
    options = Object.assign({
        resolveParams: true,
        parseDefaults: false
    }, options);

    let toString = typeof func === 'function' ? func.toString() : func;
    let name = func.name;

    let isArrow = toString.includes('=>');
    let isAsync = toString.startsWith('async ');
    let isAnonymous = !name && (toString.startsWith('function (') || toString.startsWith('('));

    let params: string[] = [], defaults: { [key: string]: any } = {};
    if (options.resolveParams) {
        defaults = {};
        params = toString.split('(')[1].split(')')[0].split(',').map( param => {
            if ( param.includes('=') ) {
                let [name, value] = param.split('=').map( item => item.trim() );
                options.parseDefaults && (defaults[name] = eval(value));
                return name;
            }
            return param.trim();
        });
    }

    return { name, isArrow, isAnonymous, isAsync, params, defaults };
}

export default parseFunction;