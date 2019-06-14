/**
 * Command-line
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Cli {

    public print(...params: any[]) {
        console.log( ...params.map(this._optimizeParameter) );
    }

    public success(...params: any[]) {
        this.print(`<bg:green><black>Success</black></bg:green>`, ...params);
    }

    public error(...params: any[]) {
        this.print(`<bg:red><white>Error</white></bg:red>`, ...params);
    }

    public warning(...params: any[]) {
        this.print(`<bg:yellow><black>Warning</black></bg:yellow>`, ...params);
    }

    private _optimizeParameter(param: any) {

        if (typeof param != 'string') return param;

        return param
            // Foreground color
            .replace(/<black>(.*)?<\/black>/, (_, text) => `\x1b[30m${ text }\x1b[0m`)
            .replace(/<red>(.*)?<\/red>/, (_, text) => `\x1b[31m${ text }\x1b[0m`)
            .replace(/<green>(.*)?<\/green>/, (_, text) => `\x1b[32m${ text }\x1b[0m`)
            .replace(/<yellow>(.*)?<\/yellow>/, (_, text) => `\x1b[33m${ text }\x1b[0m`)
            .replace(/<blue>(.*)?<\/blue>/, (_, text) => `\x1b[34m${ text }\x1b[0m`)
            .replace(/<magenta>(.*)?<\/magenta>/, (_, text) => `\x1b[35m${ text }\x1b[0m`)
            .replace(/<cyan>(.*)?<\/cyan>/, (_, text) => `\x1b[36m${ text }\x1b[0m`)
            .replace(/<white>(.*)?<\/white>/, (_, text) => `\x1b[37m${ text }\x1b[0m`)
            // Background color
            .replace(/<bg:black>(.*)?<\/bg:black>/, (_, text) => `\x1b[40m${ text }\x1b[0m`)
            .replace(/<bg:red>(.*)?<\/bg:red>/, (_, text) => `\x1b[41m${ text }\x1b[0m`)
            .replace(/<bg:green>(.*)?<\/bg:green>/, (_, text) => `\x1b[42m${ text }\x1b[0m`)
            .replace(/<bg:yellow>(.*)?<\/bg:yellow>/, (_, text) => `\x1b[43m${ text }\x1b[0m`)
            .replace(/<bg:blue>(.*)?<\/bg:blue>/, (_, text) => `\x1b[44m${ text }\x1b[0m`)
            .replace(/<bg:magenta>(.*)?<\/bg:magenta>/, (_, text) => `\x1b[45m${ text }\x1b[0m`)
            .replace(/<bg:cyan>(.*)?<\/bg:cyan>/, (_, text) => `\x1b[46m${ text }\x1b[0m`)
            .replace(/<bg:white>(.*)?<\/bg:white>/, (_, text) => `\x1b[47m${ text }\x1b[0m`)
            // Style
            .replace(/<bright>(.*)?<\/bright>/, (_, text) => `\x1b[1m${ text }\x1b[0m`)
            .replace(/<dim>(.*)?<\/dim>/, (_, text) => `\x1b[2m${ text }\x1b[0m`)
            .replace(/<u>(.*)?<\/u>/, (_, text) => `\x1b[4m${ text }\x1b[0m`)
            .replace(/<b>(.*)?<\/b>/, (_, text) => `\x1b[5m${ text }\x1b[0m`)
            .replace(/<r>(.*)?<\/r>/, (_, text) => `\x1b[7m${ text }\x1b[0m`)
            .replace(/<h>(.*)?<\/h>/, (_, text) => `\x1b[8m${ text }\x1b[0m`)

    }

}