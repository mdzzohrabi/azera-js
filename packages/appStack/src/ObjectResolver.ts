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

    resolveEnv(value: string) {
        if ( value.startsWith('env://') ) {
            return process.env[ value.substr('env://'.length ) ];
        }
        return value;
    }

    resolveObject(value: any) {
        if ( value == null ) return value;
        Object.keys(value).forEach(key => {
            value[key] = this.resolve( value[key] );
        });
        return value;
    }

    resolveFunction(value: Function) {
        return value();
    }

    resolve(value: any) {
        let result = value;
        let dataType = typeof value;

        if ( this.valueResolvers[dataType] ) {
            this.valueResolvers[dataType].forEach(resolver => {
                result = resolver(result);
            });
        }

        return result;
    }

}

export interface ValueResolver {
    (value: any): any
}