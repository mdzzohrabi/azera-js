export class ServiceNotFoundError extends Error {
    constructor(name: string, stack: string[] = []) {
        stack.pop();
        super(`Service ${name} not found${ stack.length > 0 ? ', Stack: ' + stack.join(' -> ') : '' }.`);
    }
}

export class DecoratorError extends Error {
    constructor(message: string, target: any, key: string, index: number) {
        let after = '';
        if ( typeof target == 'function' || typeof target == 'object' ) {
            after += `, ${target.name || target.constructor.name}`;
            if ( key ) {
                after += '::' + key;
                if ( typeof target[key] == 'function' ) {
                    after += '()';
                }
            }
            if ( index >= 0 ) {
                after += ` parameter ${ index }`;
            }
            after += '.';
        }
        super(message + after);
    }
}