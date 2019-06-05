import { promisify } from 'util';
import { readFile } from 'fs';

const readFilePromise = promisify(readFile);

async function asyncEach<T>(items: T[], _func: (value: T) => any) {
    let len = items.length;
    for (let i = 0; i < len ; i++)
        await _func(items[i]);
}

/**
 * Object resolve ( data validator )
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class ObjectResolver {

    // Node value resolvers
    public valueResolvers: { [type: string]: ValueResolver[] } = {};

    constructor() {
        // Default resolvers
        this.valueResolvers = {
            '*': [],
            'object': [
                this.resolveObject.bind(this)
            ],
            'function': [
                this.resolveFunction.bind(this)
            ],
            'string': [
                this.resolveEnv.bind(this)
            ]
        };
    }

    $$throwError(message: string, node?: string) {
        throw Error(`Error: ${ message }, Node: ${ node || '<root>' }`);
    }

    async resolveEnv(value: string) {
        if ( value.startsWith('env://') ) {
            return process.env[ value.substr('env://'.length ) ];
        }
        return value;
    }

    async resolveImport(base: object, path: string | string[], _nodePath?: string) {

        let result = {};

        if ( Array.isArray(path) ) {
            await asyncEach( path, async chlidPath => {
                let imported = await this.resolveImport( chlidPath, _nodePath );
                result = { ...result, ...imported };
            });
        }

        if (path.endsWith('.json')) {
            return JSON.parse( await readFilePromise(path).then(r => r.toString()) );
        } 
        else if (path.startsWith('./')) {
            return require(path);
        }
        else {
            this.$$throwError(`Invalid import value ${ path }`, _nodePath);
        }
    }

    async resolveObject(value: any, _path?: string) {
        if ( value == null ) return value;
        await asyncEach( Object.keys(value), async key => {
            let nodeValue = value[key];
            if ( key == '$imports' ) {
                await this.resolveImport( value[key], nodeValue, _path );
            } else {
                value[key] = await this.resolve( nodeValue, _path + '.' + key );
            }
        });
        return value;
    }

    async resolveFunction(value: Function) {
        return value();
    }

    /**
     * 
     * @param value Value to resolve
     * @param path Node path (internal)
     */
    async resolve<T>(value: T, _path?: string): Promise<T>
    {
        let result = value;
        let dataType = typeof value;

        await asyncEach( this.valueResolvers['*'], async resolver => {
            result = await resolver(result, _path);
        });

        if ( this.valueResolvers[dataType] ) {
            await asyncEach( this.valueResolvers[dataType], async resolver => {
                result = await resolver(result, _path);
            });
        }

        return result;
    }

}

export interface ValueResolver {
    (value: any, _path?: string): any
}