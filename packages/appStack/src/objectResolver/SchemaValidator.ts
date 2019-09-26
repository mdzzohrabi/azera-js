import { ResolverInfo } from './ObjectResolver';
import { setProperty, invariant } from '../Util';

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
    node(nodePath: string, type?: Partial<ResolverSchemaField>): SchemaValidator;
    node(nodePath: string, type?: (node: ResolverSchemaField) => void): SchemaValidator;
    node(nodePath: string, schema?: any): SchemaValidator
    {
        if (typeof schema == 'string') {
            schema = {
                type: schema
            };
        }
        let node = this.schema[nodePath] || (this.schema[nodePath] = typeof schema == 'object' && schema || {});
        node.nodePathTest = node.nodePathTest || new RegExp('^' + nodePath.replace('.', '[.|]').replace('**', '[^\\s]+').replace('*', '[^.|\\s]+') + '$');
        node.path = nodePath;
        if (typeof schema == 'function')
            schema(node);
        return this;
    }

    findNode(path: string | string[]) {
        if (Array.isArray(path)) path = path.join('|');
        else path = path.replace('.', '|');
        return Object.values(this.schema).find(node => node.nodePathTest!.test(path as string));
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

            let isArrayItem = Number(info.nodePath[info.nodePath.length - 1]).toString() == info.nodePath[info.nodePath.length - 1] || Number(info.nodePath[info.nodePath.length - 2]).toString() == info.nodePath[info.nodePath.length - 2];

            let parentNode = this.findNode(info.nodePath.slice(0, info.nodePath.length - 1));

            if (!parentNode && isArrayItem) {
                parentNode = this.findNode(info.nodePath.slice(0, info.nodePath.length - 2));
            }

            // Array node
            if (isArrayItem && parentNode && parentNode.type == 'array') {
                return value;
            }

            let nodeSchema = this.findNode(info.nodePath);

            if (nodeSchema) {
                if (info.nonVisitedNodes[nodeSchema.path])
                    delete info.nonVisitedNodes[nodeSchema.path];
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

export interface ResolverSchemaField {
    path: string
    description?: string
    required?: boolean
    validate?: (value: any, info: ResolverInfo) => any
    type?: string
    nodePathTest?: RegExp
    default?: any
    skipChildren?: boolean
}

export class ResolverSchema { [nodePath: string]: ResolverSchemaField }

