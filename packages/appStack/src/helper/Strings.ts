export const REGEX_WORD = /([A-Za-z]+?)(?=[A-Z_\-\\\/0-9]|\b|\s)/g;


/**
 * Camel-case an string, e.g :
 * ```
 * camelCase('Hello world'); // helloWorld
 * camelCase('hello_world'); // helloWorld
 * ```
 * @param value String to convert
 */
export function camelCase(value: string) {
    let result = '';
    
    value.replace(REGEX_WORD, (m, w) => {
        result += w.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
        return '';
    });
    
    return result.replace(/^[A-Z]/, a => a.toLowerCase());
}

/**
 * Snake-case string, e.g :
 * ```
 * snakeCase('helloWorld'); // hello_world
 * snakeCase('Hello world'); // hello_world
 * ```
 * @param value String to be snake-cased
 */
export function snakeCase(value: string) {
    let result: string[] = [];
    value.replace(REGEX_WORD, (m, w: string) => {
        result.push(w.toLowerCase());
        return '';
    });
    return result.join('_');
}

/**
 * Humanize string, e.g :
 * ```
 * humanize('hello-world'); // Hello world
 * humanize('helloWorld'); // Hello world
 * ```
 * @param value String to convert
 */
export function humanize(value: string) {
    let result: string[] = [];
    value.replace(REGEX_WORD, (m, w: string) => {
        result.push(w.toLowerCase());
        return '';
    });
    if (result.length > 0) result[0] = result[0].charAt(0).toUpperCase() + result[0].slice(1);
    return result.join(' ');
}

/**
 * Pascal-case string, e.g :
 * ```
 * humanize('hello-world'); // HelloWorld
 * humanize('helloWorld'); // HelloWorld
 * ```
 * @param value String to convert
 */
export function pascalCase(value: string) {
    let result = '';
    
    value.replace(REGEX_WORD, (m, w) => {
        result += w.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
        return '';
    });
    
    return result;
}

/**
 * Dasherize string, e.g :
 * ```
 * snakeCase('helloWorld'); // hello-world
 * snakeCase('Hello world'); // hello-world
 * ```
 * @param value String
 */
export function dasherize(value: string) {
    let result: string[] = [];
    value.replace(REGEX_WORD, (m, w: string) => {
        result.push(w.toLowerCase());
        return '';
    });
    return result.join('-');
}