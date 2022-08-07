import { is } from '@azera/util';
import { HashMap } from '@azera/util/is';
import { asyncEach, debugName, invariant, setProperty } from '../helper/Util';
import { ResolverInfo } from './ObjectResolver';

/**
 * Schema validator
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class SchemaValidator {

    /**
     * Allow custom nodes
     */
    public allowExtra: boolean = false;

    /**
     * Validator schema
     */
    public schema: { [nodePath: string]: ResolverSchemaField } = {};

    /**
     * Default type validators
     */
    public typeValidators: { [type: string]: ResolverSchemaTypeValidator } = {
        /** Function */
        function: value => typeof value == 'function',
        /** String */
        string: value => typeof value == 'string',
        /** Object */
        object: value => typeof value == 'object',
        /** Array */
        array: value => Array.isArray(value),
        /** Number */
        number: value => !!Number(value),
        /** Boolean */
        boolean: value => value == true || value == false,
        /** IN (Array.includes) */
        in: (value, ...items) => items.includes(value),
        /** Enum (Array.includes) */
        enum: (value, ...items) => items.includes(value),
        /** is Valid Email address */
        email: value => /[a-zA-Z_\-.0-9]\@[a-zA-Z_\-.0-9]/.test(value),
        /** Phone number */
        phone: value => /[0-9]{4,20}/.test(value),
        /** Mobile number */
        mobile: value => /[0-9]{11}/.test(value),
        /** IP */
        ip: value => /([0-9]){1,3}\.([0-9]{1,3}\.){3}/.test(value),
        /** Mongo ObjectId */
        objectId: value => /^[0-9a-fA-F]{24}$/.test(value),
        /** Range */
        between: (value, from, to) => Number(value) >= Number(from) && Number(value) <= Number(to),
        /** Min */
        min: (value, min) => Number(value) >= Number(min),
        /** Max */
        max: (value, max) => Number(value) <= Number(max),
        /** Date */
        date: value => value instanceof Date,
        /** Regex */
        match: (value, pattern) => new RegExp(pattern).test(value)
    }

    /**
     * 
     * @param schema Validator schema
     * @param typeValidators Type validators
     */
    constructor(
        schema: ResolverSchema = {},
        typeValidators: { [type: string]: ResolverSchemaTypeValidator } = {}
    )
    {
        if (schema) {
            // Prepare validator
            for (let nodePath in schema) {
                this.node(nodePath, schema[nodePath] as any);
            }
        }

        if (typeValidators) this.typeValidators = { ...this.typeValidators, ...typeValidators };
    }


    /**
     * Define node in schema
     * @param nodePath Node path (eg. validator.allowExtra)
     * @param schema Field schema
     */
    node(nodePath: string, schema: Partial<ResolverSchemaField>): SchemaValidator;

    /**
     * Define node in schema
     * @param nodePath Node path (eg. validator.allowExtra)
     * @param scope    A Function that modify node schema
     */
    node(nodePath: string, scope: (node: ResolverSchemaFieldBuilder) => void): SchemaValidator;

    /**
     * Define node in schema
     * @param nodePath Node path (eg. validator.allowExtra)
     * @param type Field type
     */
    node(nodePath: string, type: string): SchemaValidator;

    /**
     * Get a node schema definition
     * @param nodePath Node path
     */
    node(nodePath: string): ResolverSchemaField;
    node(nodePath: string, schema?: any): SchemaValidator | ResolverSchemaField
    {
        if (schema === undefined) return this.schema[nodePath];

        if (typeof schema == 'function') {
            let builder = new ResolverSchemaFieldBuilder();
            schema(builder);
            schema = builder;
            // Sub-schema
            if (builder.schema) {
                for (let [subNodePath, subSchema] of Object.entries(builder.schema)) {
                    this.node(builder.type == 'array' ? nodePath + '.*.' + subNodePath : nodePath + '.' + subNodePath, subSchema as any);
                }
            }
        } else if (typeof schema == 'string') {
            schema = { type: schema };
        }

        let node = this.schema[nodePath] || (this.schema[nodePath] = typeof schema == 'object' && schema || {});
        node.__nodePathTest = node.__nodePathTest || new RegExp('^' + nodePath.replace(/\./g, '[.|]').replace(/\*{2}/g, '[^\\s]+').replace(/\*/g, '[^.|\\s]+') + '$');
        node.__path = nodePath;
        return this;
    }

    /**
     * Founded node cache
     */
    private searchCache: { [path: string]: ResolverSchemaField | undefined } = {};

    /**
     * Find a node by given path
     * @param path Node path (e.g: database.connections)
     */
    findNode(path: string | string[]) {
        if (Array.isArray(path)) path = path.join('|');
        else path = path.replace('.', '|');
        if (path in this.searchCache) return this.searchCache[path];
        return this.searchCache[path] = Object.values(this.schema).find(node => node.__nodePathTest!.test(path as string));
    }

    private throwError(message: string | Error, node: ResolverSchemaField, ...params: any[]) {
        throw new SchemaValidatorError(node.errorMessage ? (is.Function(node.errorMessage) ? node.errorMessage(params[0]) : node.errorMessage.replace('%value%', params[0])) : String(message));
    }

    /**
     * Validator resolver methods
     */
    resolver = {
        '*': async (value: any, info: ResolverInfo) => {
            info.nonVisitedNodes = info.nonVisitedNodes || { ...this.schema };
            // Root node
            if (info.nodePath.length == 0 || info.nodePath[0] == '$schema')
                return value;

            let isArrayItem = Number(info.nodePath[info.nodePath.length - 1]).toString() == info.nodePath[info.nodePath.length - 1] || Number(info.nodePath[info.nodePath.length - 2]).toString() == info.nodePath[info.nodePath.length - 2];

            let parentNode = this.findNode(info.nodePath.slice(0, info.nodePath.length - 1));

            if (!parentNode && isArrayItem) {
                parentNode = this.findNode(info.nodePath.slice(0, info.nodePath.length - 2));
            }

            let nodeSchema = this.findNode(info.nodePath);

            // Array node
            if (isArrayItem && parentNode && parentNode.type == 'array') {
                if (nodeSchema?.validate) {
                    if (is.Function(nodeSchema.validate)) {
                        return await nodeSchema.validate(value, info);
                    }
                    await asyncEach(nodeSchema.validate, async validate => value = await validate(value, info));
                }
                return value;
            }


            if (nodeSchema) {
                if (info.nonVisitedNodes[nodeSchema.__path!])
                    delete info.nonVisitedNodes[nodeSchema.__path!];
                if (nodeSchema.type) {
                    let ok = false;
                    if (is.Function(nodeSchema.type)) {
                        ok = nodeSchema.type(value);
                    } else {
                        let types = nodeSchema.type.split('|');
                        for (let type of types) {
                            if (type.indexOf(':') > 0) {
                                let [typeName, params] = type.split(':');
                                ok = ok || this.typeValidators[typeName](value, ...params.split(','));
                            }
                            else {
                                ok = ok || this.typeValidators[type](value);
                            }
                            if (ok)
                                break;
                        }
                    }
                    if (!ok) this.throwError(`Node value must be a valid "${nodeSchema.type}", given type is "${debugName(value)}"`, nodeSchema, value);
                }
                if (nodeSchema.skipChildren)
                    info.skipChildren = nodeSchema.skipChildren;
                if (nodeSchema.validate) {
                    try {
                        if (is.Function(nodeSchema.validate)) {
                            return await nodeSchema.validate(value, info);
                        }
                        await asyncEach(nodeSchema.validate, async validate => value = await validate(value, info));
                        return value;
                    } catch (e) {
                        this.throwError(e instanceof Error ? e.message : String(e), nodeSchema, value);
                    }
                }
            }
            else if (!this.allowExtra) {
                throw new SchemaValidatorError(`This node not defined in schema`);
            }
            return value;
        },
        '*:after': (value: any, info: ResolverInfo) => {

            let nodeSchema = this.findNode(info.nodePath);

            if (nodeSchema && nodeSchema.afterResolve) {
                return nodeSchema.afterResolve(value, info);
            }

            return value;

        },
        afterResolve: (value: any, info: ResolverInfo) => {
            let nonVisitedNodes: HashMap<ResolverSchemaField> = info.nonVisitedNodes || {};
            Object.keys(nonVisitedNodes).forEach(nodePath => {
                let node = nonVisitedNodes[nodePath];
                if (node.default) {
                    setProperty(value, nodePath, typeof node.default == 'function' ? node.default() : node.default);
                }
                else if (node.required) {
                    throw Error(`Node "${nodePath}"${node.description ? `(${node.description})` : ``} is required`);
                }
            });
            return value;
        }
    };

    getJsonSchema() {
        let schema = {
            $schema: "http://json-schema.org/draft-04/schema#",
            title: "Application Configuration Schema",
            type: "object",
            additionalProperties: true,
            properties: {} as any,
            definitions: {} as any
        };

        Object
            .keys(this.schema)
            .sort((a, b) => a.length < b.length ? -1 : 1) // From A to B
            .forEach(nodePath => {
                // Field schema
                let node = this.schema[nodePath];
                let parts = nodePath.split('.');
                let deepSize = parts.length;
                let i = 0;
                let parent = schema.properties;
                let isArray = false;
                let lastPartName: string;
                let isHashObject = false;

                let nodeSchema = {} as any;

                // Description
                if ( node.description ) nodeSchema.description = node.description;

                // Type
                if ( node.type ) {
                    let enums: any[] = [];
                    let types = is.Function(node.type) ? 'string' :  node.type.split('|').map(item => {
                        let [type, params] = item.split(':');
                        if (type == 'in' || type == 'enum') {
                            enums = params.split(',');
                            return 'string';
                        }
                        return type;
                    });
                    if (enums.length > 0)
                        nodeSchema.enum = enums;
                    if (types.length == 1) nodeSchema.type = types[0];
                    else nodeSchema.type = types;
                }

                // Default value
                if (node.default) {
                    nodeSchema.default = typeof node.default == 'function' ? node.default() : node.default;
                }

                // Deep into node path from root
                parts.forEach(part => {

                    i++;
                    
                    // Wild card node
                    if (part.startsWith('*') && !isArray) {
                        return;
                    }

                    // Leaf node
                    if (deepSize == i) {
                        if ( Array.isArray(parent) ) {
                            parent.push(nodeSchema);
                        } else {
                            parent[part] = nodeSchema;
                        }
                    }
                    else
                    // Parent nodes
                    {

                        if (part.startsWith('*') && Array.isArray(parent)) {
                            let _parent = parent.find(item => item.type == 'object');
                            if (!_parent) parent.push(_parent = { type: 'object' });
                            if (!_parent['properties']) _parent['properties'] = {};
                            parent = _parent['properties'];
                            return;
                        }

                        invariant(parent = parent[part], `parent node "${ parts.slice(0, i).join('.') }" not defined in schema for "${ parts.join('.') }", please define it."`);

                        isArray = parent.type == 'array'; // Array
                        isHashObject = !!parts[i] && parts[i].startsWith('*');  // Assumes that it is an object if next node is *
                        let propName = isArray ? 'items' : 'properties';

                        if (isHashObject && !isArray) {
                            parent = parent["patternProperties"] || (parent["patternProperties"] = {});
                            parent = parent[".*"] || (parent[".*"] = {});
                            let hashNodePath = parts.slice(0, i + 1).join('.');

                            if ( !this.schema[hashNodePath] ) throw Error(`Schema node not defined for "${ hashNodePath }"`);

                            parent["description"] = this.schema[hashNodePath].description;
                            parent = parent["properties"] || (parent["properties"] = {});
                        } else {
                            // Go to next node
                            if (isArray) {
                                parent = (parent['items'] || (parent['items'] = []));
                            } else {
                                parent = parent['properties'] || (parent['properties'] = {}); 
                            }
                        }
                    }

                    // Previous part name
                    lastPartName = part;
                })
            });

        return schema;
    }
}

export class ResolverSchemaField {
    description?: string
    required?: boolean
    validate?: ((value: any, info: ResolverInfo) => any) | ((value: any, info: ResolverInfo) => any)[]
    afterResolve?: (value: any, info: ResolverInfo) => any
    type?: string | ((value: any) => boolean)
    default?: any
    skipChildren?: boolean
    errorMessage?: string | ((value: string) => string)
    schema?: ResolverSchema
    __path?: string
    __nodePathTest?: RegExp
}

export class SchemaValidatorError extends Error {}

export class ResolverSchemaFieldBuilder extends ResolverSchemaField {
    withDefault(value: any) { this.default = value; return this; };
    isEmail = () => this.addType('email');
    isMobile = () => this.addType('mobile');
    isRequired() { this.required = true; return this; }
    isString = () => this.addType('string');
    isObject = (schema?: ResolverSchema) => this.addType('object').withSchema(schema);
    isNamedKeyObject = (schema: ResolverSchema, description?: string) => this.addType('object').withSchema({ '*': _ => _.withDescription(description ?? '').isObject(schema!) });
    isFunction = () => this.addType('function');
    isArray = (schema?: ResolverSchema) => this.addType('array').withSchema(schema);
    isNumber = () => this.addType('number');
    isIP = () => this.addType('ip');
    isBoolean = () => this.addType('boolean');
    isObjectId = () => this.addType('objectId');
    isDate = () => this.addType('date');
    isMatch = (pattern: string | RegExp) => this.addType(`match:${pattern instanceof RegExp ? pattern.source : pattern}`);
    is(fn: (value: any) => boolean) { this.type = fn; return this; };
    enum = (...values: string[]) => this.addType('enum:' + values.join(','));
    between = (from: number, to: number) => this.addType(`between:${from},${to}`)
    contains = (text: string) => this.addType('string').sanitize(v => { if (!String(v).includes(text)) throw new SchemaValidatorError(`Given value does not contains "${text}"`); v}); 
    startsWith = (text: string) => this.addType('string').sanitize(v => { if (!String(v).startsWith(text)) throw new SchemaValidatorError(`Given value does not start with "${text}"`); v}); 
    withError(message: string | ((value: string) => string)) { this.errorMessage = message; return this; }
    sanitize(fn: (value: any, info: ResolverInfo) => any) { this.validate = this.validate === undefined ? fn : Array.isArray(this.validate) ? this.validate.concat(fn) : [this.validate, fn] ; return this; }
    toString = () => this.sanitize(v => String(v));
    toNumber = () => this.sanitize(v => Number(v));
    trim = () => this.sanitize(v => String(v).trim());
    escape = () => this.sanitize(v => encodeURIComponent(String(v)))
    toArray = () => this.sanitize(v => Array.isArray(v) ? v : [v]);
    toDate = () => this.sanitize(v => new Date(v));
    mapBy = (dic: { [key: string]: any }) => this.sanitize(v => dic[v]);
    toObjectId = () => this.sanitize(v => import('mongodb').then(m => new m.ObjectId(v)))
    toLower = () => this.sanitize(v => String(v).toLowerCase());
    toUpper = () => this.sanitize(v => String(v).toUpperCase());
    replace = (search: any, replace: string) => this.sanitize(v => String(v).replace(search, replace));
    protected addType(type: string) { this.type = (this.type ? this.type + '|' : '') + type; return this; }
    withDescription(text: string) { this.description = text; return this; }
    withSchema = (schema?: ResolverSchema) => { this.schema = schema; return this; }
}

export type ResolverSchemaTypeValidator = (value: any, ...params: any[]) => boolean;

export class ResolverSchema { [nodePath: string]: ResolverSchemaField | string | ((node: ResolverSchemaFieldBuilder) => void) }
