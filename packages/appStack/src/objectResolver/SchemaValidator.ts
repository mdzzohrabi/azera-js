import { ResolverInfo } from './ObjectResolver';
import { setProperty } from '../Util';

/**
 * Schema validator
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class SchemaValidator {

    /**
     * Allow custom nodes
     */
    public allowExtra: boolean = false;

    constructor(

        /**
         * Validator schema
         */
        public schema: ResolverSchema = {},

        /**
         * Default type validators
         */
        public typeValidator: { [type: string]: (value: any, ...params: any[]) => boolean; } = {
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
            enum: (value, ...items) => items.includes(value)
        }) { }

    /**
     * Define node in schema
     * @param nodePath Node path (eg. validator.allowExtra)
     * @param scope    A Function that modify node schema
     */
    node(nodePath: string, scope?: (node: ResolverSchemaField) => void): SchemaValidator;

    /**
     * Define node in schema
     * @param nodePath Node path (eg. validator.allowExtra)
     * @param schema Field schema
     */
    node(nodePath: string, schema?: ResolverSchemaField): SchemaValidator;

    /**
     * Define node in schema
     * @param nodePath Node path (eg. validator.allowExtra)
     * @param type Field type
     */
    node(nodePath: string, type?: string): SchemaValidator;
    node(nodePath: string, schema?: any): SchemaValidator
    {
        if (typeof schema == 'string') {
            schema = {
                type: schema
            };
        }
        let node = this.schema[nodePath] || (this.schema[nodePath] = typeof schema == 'object' && schema || {});
        node.nodePathTest = node.nodePathTest || new RegExp('^' + nodePath.replace('.', '[.|]').replace('**', '[^\\s]+').replace('*', '[^.|\\s]+') + '$');
        if (typeof schema == 'function')
            schema(node);
        return this;
    }

    /**
     * Validator resolver method
     */
    resolver = {
        '*': (value: any, info: ResolverInfo) => {
            info.nonVisitedNodes = info.nonVisitedNodes || { ...this.schema };
            // Root node
            if (info.nodePath.length == 0 || info.nodePath[0] == '$schema')
                return value;
            let nodePath = info.nodePath.join('|');
            let node = Object.keys(this.schema).filter(path => this.schema[path].nodePathTest!.test(nodePath)).pop();
            if (node) {
                let nodeSchema = this.schema[node];
                if (info.nonVisitedNodes[node])
                    delete info.nonVisitedNodes[node];
                if (nodeSchema.type) {
                    let ok = false;
                    let types = nodeSchema.type.split('|');
                    for (let type of types) {
                        if (type.indexOf(':') > 0) {
                            let [typeName, params] = type.split(':');
                            ok = ok || this.typeValidator[typeName](value, ...params.split(','));
                        }
                        else {
                            ok = ok || this.typeValidator[type](value);
                        }
                        if (ok)
                            break;
                    }
                    if (!ok)
                        throw Error(`Node "${info.nodePath.join('.')}" must be a valid ${nodeSchema.type}, given type is ${typeof value}`);
                }
                if (nodeSchema.skipChildren)
                    info.skipChildren = nodeSchema.skipChildren;
                if (nodeSchema.validate)
                    return nodeSchema.validate(value, info);
            }
            else if (!this.allowExtra) {
                throw Error(`This node not defined in schema`);
            }
            return value;
        },
        afterResolve: (value: any, info: ResolverInfo) => {
            let nonVisitedNodes: ResolverSchema = info.nonVisitedNodes || {};
            Object.keys(nonVisitedNodes).forEach(nodePath => {
                let node = nonVisitedNodes[nodePath];
                if (node.default) {
                    setProperty(value, nodePath, typeof node.default == 'function' ? node.default() : node.default);
                }
                else if (node.required) {
                    throw Error(`Node "${nodePath}" (${node.description}) must be entered but not found any value`);
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
                    let types = node.type.split('|').map(item => {
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
                    
                    if (part.startsWith('*')) {
                        return;
                    }

                    // Leaf node
                    if (deepSize == i) {
                        parent[part] = nodeSchema;
                    }
                    else
                    // Parent nodes
                    {
                        parent = parent[part];
                        isArray = parent.type == 'array';
                        isHashObject = !!parts[i] && parts[i].startsWith('*');
                        let propName = isArray ? 'items' : 'properties';

                        if (isHashObject) {
                            parent = parent["patternProperties"] || (parent["patternProperties"] = {});
                            parent = parent[".*"] || (parent[".*"] = {});
                            let hashNodePath = parts.slice(0, i + 1).join('.');

                            if ( !this.schema[hashNodePath] ) throw Error(`Schema node not defined for "${ hashNodePath }"`);

                            parent["description"] = this.schema[hashNodePath].description;
                            parent = parent["properties"] || (parent["properties"] = {});
                        } else {
                            parent = parent[propName] || (parent[propName] = {});
                        }
                    }

                    // Previous part name
                    lastPartName = part;
                })
            });

        return schema;
    }
}

export interface ResolverSchemaField {
    description?: string
    required?: boolean
    validate?: (value: any, info: ResolverInfo) => any
    type?: string
    nodePathTest?: RegExp
    default?: any
    skipChildren?: boolean
}

export class ResolverSchema { [nodePath: string]: ResolverSchemaField }

