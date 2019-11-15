export namespace i18n {

    export interface Locale {
        code: string
        name: string
        messages: { [name: string]: string }
    }

    const locales: { [code: string]: Locale } = {
        fa: {
            name: 'Persian',
            code: 'fa',
            messages: {
                direction: 'rtl',
                'Delete': 'حذف',
                'Insert': 'افزودن',
                'Create': 'ایجاد'
            }
        }
    };

    export let locale = 'en';
    export let REGEX_PARAM = /\%s/g

    export function set(code: string, messages: { [name: string]: string }): void
    export function set(code: string, name: string, message: string): void
    export function set(code: string, name: any, message?: string) {
        locales[code] = locales[code] || { code: code, messages: {}, name: code };
        if (typeof name == 'string') {
            locales[code].messages[name] = message;
        } else if (typeof name == 'object') {
            Object.keys(name).forEach(n => {
                locales[code].messages[n] = name[n];
            })
        }
    }

    export function trans(message: string, ...params: string[]) {
        let i = 0;
        return locales[locale] && locales[locale].messages[message] && locales[locale].messages[message].replace(REGEX_PARAM, () => params[i++]) || message.replace(REGEX_PARAM, () => params[i++]);
    }
}