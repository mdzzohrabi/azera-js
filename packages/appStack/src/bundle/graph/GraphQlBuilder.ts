import type { GraphQLSchema } from 'graphql';
import { Container, Inject } from '@azera/container';
import { getClassDecoratedProps, getMeta, hasMeta } from '../../decorator/Metadata';
import { invariant } from '../../helper/Util';
import { FieldInputsType, GraphQl } from './Decorators';
import { is } from '@azera/util';

export class GraphQlBuilder {

    constructor (@Inject() public container: Container = new Container) {}

    toGraphQlType(type: any): string {
        switch (type) {
            case Number: return 'Int';
            case String: return 'String';
            case Boolean: return 'Boolean';
            case Array: throw Error(`Array is not a valid GraphQl Type`);
            default: {
                if (typeof type == 'function') {
                    let meta = getMeta(GraphQl.Type, type) ?? getMeta(GraphQl.Input, type);
                    if (meta) {
                        return meta.name;
                    } else {
                        throw Error(`Invalid GraphQl Type ${type.name}`);
                    }
                } else if (Array.isArray(type)) {
                    if (type[0]) return '[' + this.toGraphQlType(type[0]) + ']';
                    return '[String]';
                }
                return type;
            }
        }
    }

    isInternalType(type: any) {
        return [Number, String, Boolean].includes(type);
    }

    isValidType(type: any) {
        return typeof type == 'function' && hasMeta(GraphQl.Type, type);
    }

    isValidInputType(type: any) {
        return typeof type == 'function' && hasMeta(GraphQl.Input, type);
    }

    async toResolvers(...objects: any[]) {
        let resolvers: any = {};
        let resolved: any[] = [];

        for (let object of objects) {
            // Ignore duplicate
            if (resolved.includes(object)) continue;
            resolved.push(object);

            if (this.isValidType(object)) {
                let type = getMeta(GraphQl.Type, object)!;
                let instance = await this.container.invokeAsync(object);

                // Make invoke later fields
                getClassDecoratedProps(object)?.forEach((_, name) => {
                    if (hasMeta(GraphQl.Field, object, name)) {
                        instance[name] = this.container.invokeLaterAsync(instance, name);
                    }
                });

                resolvers[type.name] = instance;
            }
        }

        return resolvers;
    }

    private convertInputsToTypeDef(inputs: FieldInputsType) {
        let typeDef = ``;
        let types = [];
        if (Object.keys(inputs ?? {}).length > 0) {
            typeDef = `(`;
            for (let inputName in inputs) {
                if (inputName.startsWith('$$')) continue;
                let input = inputs[inputName];

                // Push input type to type resolution
                if (typeof input == 'object') {
                    invariant(this.isValidInputType(input.type) || this.isInternalType(input.type), `Invalid input type %s`, input.type?.name);
                    if (this.isValidInputType(input.type)) {
                        types.push(input.type);
                    }
                }

                typeDef += `${inputName}: ${this.toGraphQlType(typeof input == 'string' ? input : input.type) + (input.required ? '!' : '') + (input.default ? ' = ' + input.default : '')}`
            }
            typeDef += `)`;
        }
        return { typeDef, types };
    }
   
    async buildDirectives(...objects: any) {
        let { mapSchema, MapperKind, getDirective } = await import('@graphql-tools/utils');
        let directives: Function[] = [];
        let typeDefs: string[] = [];
        let types: any[] = [];
        for (let object of objects) {
            getClassDecoratedProps(object).forEach((_, prop) => {
                if (hasMeta(GraphQl.Directive, object, prop)) {
                    let meta = getMeta(GraphQl.Directive, object, prop)!;

                    // Type definition
                    if (meta.typeDef) {
                        typeDefs.push(meta.typeDef)
                    } else {
                        let { typeDef: inputs , types: inputTypes } = this.convertInputsToTypeDef(meta.inputs ?? {});
                        typeDefs.push(`directive @${meta.name}${inputs} on ${meta.on}`);
                        types.push(inputTypes);
                    }

                    /** Directive Transformer */
                    let directiveTransformer = (schema: GraphQLSchema, directiveName: string) => mapSchema(schema, {
                        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
                            let baseResolve = fieldConfig.resolve;
                            fieldConfig.resolve = meta.resolver;
                            return fieldConfig;
                        }
                    });

                    directives.push(directiveTransformer);
                }
            });
        }

        return { directives, typeDefs, types };
    }

    private escapeDescription(description: string) {
        if (description.indexOf("\n") >= 0) {
            return `"""\n${description}\n"""`;
        } else {
            return `"${description}"`;
        }
    }

    /**
     * Generate GraphQL SDL from Type decorated object
     * @param objects Target Type Objects
     */
    async build(...objects: any[]) {

        let resolvers: any = {};
        let result = ``;
        let resolved: any[] = [];

        for (let object of objects) {
            
            // Ignore duplicate
            if (resolved.includes(object)) continue;
            resolved.push(object);

            let typeMeta = getMeta(GraphQl.Type, object);
            let inputMeta = getMeta(GraphQl.Input, object);

            let type = (typeMeta ?? inputMeta)!;

            invariant(type, `Invalid GraphQl Type ${object}`);

            let sdl = `${type.type ?? 'type'} ${type.name} {`;
            let instance: any;

            if (type.description) {
                sdl = `${this.escapeDescription(type.description)}\n${sdl}`;
            }

            // Build resolver
            if (typeMeta) {
                instance = Object.create( await this.container.invokeAsync(object) );
            }

            // Type Fields
            getClassDecoratedProps(object)?.forEach((_, name) => {
                let field = getMeta(GraphQl.Field, object, name);

                // Field meta-data found
                if (field && !Array.isArray(field)) {

                    // Make instance field injectable
                    if (instance) {
                        let originalResolver: Function = this.container.getDefinition(object).methods[name] ? this.container.invokeLaterAsync(object, name) : instance[name];

                        if (is.Function(originalResolver)) {
                            if (!field.inputsIndex || Object.keys(field!.inputsIndex).length == 0) {
                                instance[name] = originalResolver;
                            } else {
                                // Prepare field resolver
                                instance[name] = function GraphQlResolver(parent: any, args: any, context: any) {
                                    let data = { $parent: parent, $: parent, ...(args ?? {}), $context: context };
                                    let params = [];
                                    for (let key in field!.inputsIndex) {
                                        params.push(data[key]);
                                    }
                                    return originalResolver.apply(instance, params);
                                }
                            }
                        } else if (originalResolver !== undefined) {
                            instance[name] = () => originalResolver;
                        }
                    }

                    if (field.typeDef) {
                        sdl += `\n\t${field.typeDef}`;
                    } else {
                        // Field inputs
                        let { typeDef: inputs , types } = this.convertInputsToTypeDef(field.inputs ?? {});

                        // Push found types in inputs to resolve queue
                        objects.push(...types);

                        // Push return type to resolution
                        if (Array.isArray(field.type) && this.isValidType(field.type[0])) objects.push(field.type[0]);
                        else if (this.isValidType(field.type)) objects.push(field.type);

                        sdl += `\n\t${field.description ? this.escapeDescription(field.description) + "\n\t" : ''}${field.name}${inputs}: ${this.toGraphQlType(field.type)}`;
                    }
                }
            });
    
            sdl += `\n}`;

            if (instance) {
                resolvers[type.name] = instance;
            }

            result += sdl + "\n";
        };

        return { resolvers, sdl: result.trim() };

    }

    async buildSchema(...objects: any[]) {
        let { resolvers, sdl } = await this.build(...objects);
        let { makeExecutableSchema } = await import('apollo-server-express');

        return makeExecutableSchema({
            typeDefs: sdl,
            resolvers
        })
    }

}