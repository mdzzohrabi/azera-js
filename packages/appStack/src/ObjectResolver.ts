import { promisify } from 'util';
import { readFile } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { getPackageDir, asyncEach } from './Util';
import * as deepExtend from 'deep-extend';

const readFilePromise = promisify(readFile);

class ObjectResolverError extends Error {}

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
                this.resolveEval,
                this.resolveEnv.bind(this)
            ],
            'afterResolve': []
        };
    }

    /**
     * Throw an error prepared by resolver info
     * @param message Error message
     * @param param1 Resolver info
     */
    $$throwError(message: string, { nodePath , configFileStack }: ResolverInfo) {
        throw new ObjectResolverError(`${ message }, nodePath: ${ nodePath.join('.') || '<root>' }${ (configFileStack || []).reverse().length > 0 ? ".\nConfiguration file stack : \n-> " + configFileStack!.join("\n-> ") + "\n" : '' }`);
    }

    /**
     * Evaluation resolver
     * @param value Node value
     * @param info Resolver info
     */
    async resolveEval(value: string, info: ResolverInfo) {
        if (typeof value != 'string') return value;
        let $ = info.result;     
        if (value.startsWith('=')) return eval( value.substr(1) );
        return value;
    }

    /**
     * Environment resolver
     * @param value Node value
     */
    async resolveEnv(value: string) {
        if (typeof value != 'string') return value;
        if ( value.startsWith('env://') ) {
            return process.env[ value.substr('env://'.length ) ];
        }
        return value;
    }

    /**
     * Resolve $imports field on baseObject
     * @param baseObject Base object to extend
     * @param imports Imports
     * @param info Resolver info
     */
    async resolveImport(baseObject: any, imports: string | string[], info: ResolverInfo) {

        if ( imports == null ) return;

        let result: any = {};

        let isJson: boolean = false, isYaml: boolean = false, isModule: boolean = false;

        if ( Array.isArray(imports) ) {
            await asyncEach( imports, async chlidPath => {
                await this.resolveImport( baseObject, chlidPath, info );
            });
            return;
        }
        else if ( (isJson = imports.endsWith('.json')) || (isYaml = imports.endsWith('.yml')) || (isModule = imports.startsWith('./'))  ) {

            let { configFileStack } = info;

            // Import from another package
            if ( !imports.startsWith('./') && !path.isAbsolute(imports) ) {
                let moduleName = imports.split('/').slice(0, imports.startsWith('@') ? 2 : 1).join('/');
                let modulePath = getPackageDir(moduleName);
                imports = modulePath + imports.substr( moduleName.length );
            }

            // Find base directory from parent config file
            if ( configFileStack!.length > 0) {
                let parentPath = path.dirname( configFileStack![ configFileStack!.length - 1 ] );
                imports = path.resolve(parentPath, imports);
            }

            imports = path.normalize(imports);

            // Loop detection
            if ( configFileStack!.includes(imports) ) {
                return this.$$throwError(`Imports cycle detected on ${ imports }`, info);
            }

            configFileStack!.push(imports);

            let content: any;

            if (isJson)
                content = JSON.parse( await readFilePromise(imports).then(r => r.toString()) );
            else if (isYaml)
                content = yaml.safeLoad( await readFilePromise(imports).then(r => r.toString()) );
            else if (isModule)
                content = require(imports);

            result = await this.resolve( content , info);
            configFileStack!.pop();
        } 
        else {
            return this.$$throwError(`Invalid import value ${ imports }`, info);
        }
        
        // Extend base
        deepExtend(baseObject, deepExtend({} , result, baseObject));
    }

    /**
     * Object/Array resolver
     * @param value Node value (object)
     * @param info Resolve info
     */
    async resolveObject(value: any, info: ResolverInfo) {
        if ( value == null ) return value;
        await asyncEach( Object.keys(value), async key => {
            let nodeValue = value[key];
            if ( key == '$imports' ) {
                await this.resolveImport( value, nodeValue, info );
                delete value[key];
            } else {
                // let currentNodePath = info.nodePath;
                // let nodeName = '.' + key;
                // if (!key.match(/^[a-zA-Z_]+$/))
                //     nodeName = `['${ key }']`;
                info.nodePath.push(key);
                value[key] = await this.resolve( nodeValue, info );
                info.nodePath.pop();
            }
        });
        return value;
    }

    /**
     * Resolve Function
     * @param value Node value (will be a function)
     */
    async resolveFunction(value: Function) {
        return value();
    }

    /**
     * Resolve an object
     * @param value Value to resolve
     */
    async resolve<T>(value: T): Promise<any>

    /**
     * Resolve an object
     * @param value Value to resolve
     * @param nodePath Node path (internal)
     * @param configFileStack Stack of loaded configuration file (internal)
     */
    async resolve<T>(value: T, info: ResolverInfo): Promise<any>
    async resolve<T>(value: T, info?: ResolverInfo): Promise<any>
    {

        let rootResolver = info == undefined;

        // Final result (default is input value)
        let result = value;

        // Determine type of value
        let dataType = typeof value;

        // Resolve info
        info = info || { configFileStack: [], nodePath: [], result };
        info.nodePath = info.nodePath || [];
        info.configFileStack = info.configFileStack || [ '<object>' ];

        if (rootResolver)
            info.result = result;

        try {

            await asyncEach( this.valueResolvers['*'], async resolver => {
                result = await resolver(result, info!);
            });

            // Type specified resolvers
            if ( this.valueResolvers[dataType] ) {
                await asyncEach( this.valueResolvers[dataType], async resolver => {
                    result = await resolver(result, info!);
                });
            }

            // After resolve resolvers (Total result as node value)
            if (rootResolver) {
                await asyncEach(this.valueResolvers['afterResolve'], async resolver => {
                    result = await resolver(result, info!);
                });
            }

        } catch (e) {
            if ( e instanceof ObjectResolverError ) throw e;
            else this.$$throwError(e.message, info!);
        }

        return result;
    }

    /**
     * Get resolvers of specified data type
     * @param dataType Data type
     */
    resolvers(dataType: string) {
        return this.valueResolvers[dataType] || (this.valueResolvers[dataType] = []);
    }

    /**
     * Add resolver
     * @param resolver Resolver
     * @param dataType Data type
     */
    resolver(resolver: ValueResolver, dataType?: ResolverType): ObjectResolver
    resolver(resolvers: { [dataType: string]: ValueResolver } ): ObjectResolver
    resolver(resolver: any, dataType?: any)
    {
        if ( typeof resolver == 'function' )
            this.resolvers(dataType || '*').push(resolver);
        else if ( typeof resolver == 'object' )
            Object.keys(resolver).forEach(dataType => this.resolvers(dataType).push(resolver[dataType]));
        
        return this;
    }

    /**
     * Schema validator resolver
     */
    static schemaValidator(schema: ResolverSchema = {}) {
        return new SchemaValidator(schema);
    }

}

export type ResolverType = '*' | 'object' | 'function' | 'string' | 'number' | 'undefined' | 'boolean' | 'bigint' | 'symbol' | 'afterResolve';

export interface ResolverInfo {
    /**
     * Traversed node path
     */
    nodePath: string[]

    /**
     * Loaded configuration files
     */
    configFileStack: string[]

    /**
     * Resolved data
     */
    result: any

    /**
     * Extra debug properties
     */
    [key: string]: any
}

/**
 * Resolver interface
 */
export interface ValueResolver {
    (value: any, info: ResolverInfo): any
}


/**
 * Schema Validator
 */

export interface ResolverSchemaField {
    description?: string
    required?: boolean
    validate?: (value: any) => any
    type?: string
    nodePathTest?: RegExp
}

export class ResolverSchema { [nodePath: string]: ResolverSchemaField }

export class SchemaValidator {
    constructor(
        public schema: ResolverSchema = {},
        public typeValidator: { [type: string]: (value: any) => boolean } = {
            string: value => typeof value == 'string',
            object: value => typeof value == 'object',
            array: value => Array.isArray(value),
            number: value => !!Number(value)
        }
    ) {}

    node(nodePath: string, scope?: (node: ResolverSchemaField) => void): SchemaValidator
    node(nodePath: string, schema?: ResolverSchemaField): SchemaValidator
    node(nodePath: string, schema?: string): SchemaValidator
    node(nodePath: string, schema?: any): SchemaValidator
    {

        if (typeof schema == 'string') {
            schema = {
                type: schema
            }
        }

        let node = this.schema[nodePath] || (this.schema[nodePath] = typeof schema == 'object' && schema || {});

        node.nodePathTest = node.nodePathTest || new RegExp( '^' + nodePath.replace('.', '[.|]').replace('**', '[^\s]+').replace('*','[^.|\s]+') + '$' );

        if (typeof schema == 'function') schema(node);
        return this;
    }

    /**
     * Validator resolver
     */
    resolver = {
        '*': (value: any, info: ResolverInfo) => {

            info.nonVisitedNodes = info.nonVisitedNodes || { ...this.schema };
        
            // Root node
            if (info.nodePath.length == 0) return value;
            let nodePath = info.nodePath.join('|');
            let node = Object.keys(this.schema).filter( path => this.schema[path].nodePathTest!.test(nodePath) ).pop();

            // console.log('Visit', nodePath, node);
            if (node) 
            {
                let nodeSchema = this.schema[node];
                if ( info.nonVisitedNodes[node] ) delete info.nonVisitedNodes[node];

                if (nodeSchema.type && !this.typeValidator[ nodeSchema.type ]( value ) ) {
                    throw Error(`Node "${ nodePath }" must be a valid ${ nodeSchema.type }`);
                }

                if (nodeSchema.validate) return nodeSchema.validate(value);
            }
            else {
                throw Error(`This node not defined in schema`);
            }

            return value;
        },

        afterResolve: (value: any, info: ResolverInfo) => {

            let nonVisitedNodes: ResolverSchema = info.nonVisitedNodes || {};

            Object.keys(nonVisitedNodes).forEach(nodePath => {
                let node = nonVisitedNodes[nodePath];
                if (node.required) {
                    throw Error(`Node "${ nodePath }" (${ node.description }) must be entered but not found any value`)
                }
            });

            return value;
        }
    }
}