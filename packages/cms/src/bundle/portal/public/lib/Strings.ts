const REGEX_WORD = /([A-Za-z]+?)(?=[A-Z_\-\\\/0-9]|\b|\s)/g;
/**
 * camelCase an string
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

export function snakeCase(value: string) {
    let result = [];
    value.replace(REGEX_WORD, (m, w: string) => {
        result.push(w.toLowerCase());
        return '';
    });
    return result.join('_');
}

export function humanize(value: string) {
    let result: string[] = [];
    value.replace(REGEX_WORD, (m, w: string) => {
        result.push(w.toLowerCase());
        return '';
    });
    if (result.length > 0) result[0] = result[0].charAt(0).toUpperCase() + result[0].slice(1);
    return result.join(' ');
}