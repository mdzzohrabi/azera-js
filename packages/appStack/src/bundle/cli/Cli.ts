/**
 * Command-line
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Cli {

    public print(...params: any[]) {
        console.log( ...params.map(this._optimizeParameter) );
        return this;
    }

    public success(...params: any[]) {
        return this.print(`<bg:green><black>Success</black></bg:green>`, ...params);
    }

    public error(...params: any[]) {
        return this.print(`<bg:red><white>Error</white></bg:red>`, ...params);
    }

    public warning(...params: any[]) {
        return this.print(`<bg:yellow><black>Warning</black></bg:yellow>`, ...params);
    }

    /** Table options */
    private tableOptions: CliTableOptions = {};
    /** Table data */
    private table: ( string | any[] )[] = [];

    public startTable(options: CliTableOptions = {}) {
        this.tableOptions = {
            border: true,
            borderHorizontal: '-',
            borderSeparator: ' ⁞ ',
            borderVertical: '|',
            rowBreakLine: true,
            ...options
        };
        this.tableBreakRow();
        return this;
    }

    public tableBreakRow() {
        let { border, borderHorizontal, cellSizes, borderSeparator } = this.tableOptions;
        if ( !border ) return this;
        if ( !cellSizes ) {
            this.table.push( '$break$' );
            return this;
        }
        return this.print( cellSizes.map(s => borderHorizontal!.repeat(s + borderSeparator!.length) ).join('') );
    }

    public row(...cells: any[]) {
        let { border, borderSeparator, rowBreakLine, cellSizes } = this.tableOptions;
        
        if ( !cellSizes ) {
            this.table.push(cells);
            return this;
        }

        this.print( cells.map((cell: string, i) => {

            if ( cellSizes![i] ) return cell.toString().padEnd( cellSizes![i] );
            return cell;

        }).join(border ? borderSeparator : ' '));
        if ( rowBreakLine )
            this.tableBreakRow();

        return this;
    }

    public endTable() {
        // Auto-size
        if (this.table.length > 0) {

            this.tableOptions.cellSizes = this.table.filter(i => Array.isArray(i))
            .map(row => (<any[]>row).map(c => c.toString().length))
            .reduce(function (r, row) {
                let l = r.length > row.length ? r.length : row.length;
                return [ ...new Array(l) ].map((_, i) => Math.max( r[i] || 0, row[i] || 0 ));
            }) as number[];

            this.table.forEach(row => {

                if ( row == '$break$' ) this.tableBreakRow();
                else this.row( ...row );

            });
        }

        this.table = [];
        this.tableOptions = {};

        return this;
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

export interface CliTableOptions {

    /**
     * Draw bordered table
     */
    border?: boolean

    borderVertical?: string
    borderHorizontal?: string
    borderSeparator?: string
    rowBreakLine?: boolean
    cellSizes?: number[]

}