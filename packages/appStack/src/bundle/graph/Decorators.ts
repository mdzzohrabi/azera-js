import { Decorator, Inject } from '@azera/container';
import { getParameters } from '@azera/reflect';
import { is } from '@azera/util';
import { HashMap } from '@azera/util/is';
import { createDecorator, createMetaDecorator, getDecoratedParameters, getMeta, hasMeta } from '../../decorator/Metadata';
import { invariant } from '../../helper/Util';
import type { NextFn, Request, Response } from '../http';
import { GraphQlManager } from './GraphqlManager';

export type FieldInputsType = {
    [name: string]: any | { index: number, type: any, required?: boolean, default?: string }
}

export type FieldResolver = (...params: any) => any

export interface TypeDecoratorOptions {
    name?: string
    typeDef?: string
    description?: string
}

export interface FieldDecoratorOptions {
    name?: string
    type?: any
    inputs?: FieldInputsType
    description?: string
    deprecatedMessage?: string
    typeDef?: string
    inputsIndex?: { [name: string]: number }
}

export interface DirectiveDecoratorOptions {
    name?: string
    typeDef?: string
    inputs?: FieldInputsType
    description?: string
    resolver?: FieldResolver
    on?: 'FIELD_DEFINITION' | 'INPUT_FIELD_DEFINITION'
}

const $$FieldDirective = createDecorator(function FieldDirective(directive: any, params: any[]) {
    return { directive, params };
}, `graphql:field_directive`, true);

const $$Directive = createDecorator(function Directive(options: DirectiveDecoratorOptions = {}) {
    if (!options.inputs) {
        let params = getParameters(this.target[this.propName!], false);
        let inputs: FieldInputsType = {};
        if (params) {
            let i = 0;
            for (let param of params) {
                i++;
                if (!param.name.startsWith('$')) continue;
                inputs[param.name.substr(1)] = {
                    index: i,
                    type: this.paramTypes ? this.paramTypes[i - 1] : String,
                    default: param.value,
                    required: !param.hasDefault
                }
            }
            options.inputs = inputs;
        }
    }

    return { name: this.propName, on: 'FIELD_DEFINITION', ...options };
}, 'graphql:directive', false)

/**
 * GraphQl Decorators
 */
export const GraphQl = {

    /**
     * GraphQl Request Configuration
     */
    RequestConfig: createMetaDecorator<{ nodeName: string }, false>('graphql:request-config', false, true, true),

    /**
     * GraphQl Request decorator applies on controller actions
     * @param options GraphQl Request options
     * @returns 
     */
    Request: function GraphQlRequest(options: string | { nodeName?: string, query: string, operationName?: string, variables?: HashMap<any> }): MethodDecorator {
        return function graphQlRequestDecorator(target: any, method: string, descr: PropertyDescriptor) {
            
            if (is.String(options)) {
                options = { query: options };
            }

            let { nodeName, query, variables, operationName } = options;
            invariant(query, `GraphQl Request Node Query not defined`);
            Inject(GraphQlManager)(target, method, 0);

            descr.value = async function (manager: GraphQlManager, req: Request, res: Response, next: NextFn) {

                if (!nodeName && hasMeta(GraphQl.RequestConfig, target)) {
                    let reqConfig = getMeta(GraphQl.RequestConfig, target);
                    nodeName = reqConfig?.nodeName;
                }
    
                invariant(nodeName, `GraphQl Request Node name not defined`);  

                let result = await manager.execute(nodeName!, {
                    query,
                    variables,
                    operationName
                });

                return result.data;
            }
        }
    },

    /**
     * Graphql Type resolver decorator applies on class
     */
    Type: createDecorator(function (type: TypeDecoratorOptions = {}) {
        return { type: 'type', name: this.target.name, ...type };
    }, 'graphql:type', false),

    /**
     * GraphQl Input decorator applies on class
     */
    Input: createDecorator(function (input: TypeDecoratorOptions = {}) {
        return { type: 'input', name: this.target.name, ...input };
    }, `graphql:input`, false),
    

    /** GraphQl Field Parameter decorator */
    Param: createDecorator(function (name?: string) { return { name, index: this.index } }, `graphql:parameter`, false),
    /** GraphQl Field Context decorator */
    Context: createDecorator(function () { return { index: this.index } },`graphql:contextParameter`, false),
    /** GraphQl Field Parent decorator */
    Parent: createDecorator(function () { return { index: this.index } },`graphql:parentParameter`, false),

    /**
     * Graphql Field resolver decorator
     */
    Field: createDecorator(function (field?: string | FieldDecoratorOptions) {

        if (!field) field = {};

        if (typeof field == 'string') {
            field = { typeDef: field, inputs: {} };
        }
        else if (this.propName && is.Function(this.target.prototype[this.propName])) {           
            // Decorated parameters
            let decoratedParameters = getDecoratedParameters(this.target, this.propName);
            let isDecoratedParams = decoratedParameters.size > 0;
         
            // Get paramters from reflection
            let params = getParameters(this.target.prototype[this.propName], false);

            if (params) {
                field.inputsIndex = {};
                
                let generateInputs = !field.inputs;
                if (generateInputs) {
                    field.inputs = {};
                }

                let i = 0;
                for (let param of params) {
                    if (isDecoratedParams) {
                        if (decoratedParameters.has(String(i))) {
                            if (hasMeta(GraphQl.Context, this.target, this.propName, i)) {
                                field.inputsIndex['$context'] = i;
                            }
                            else if (hasMeta(GraphQl.Parent, this.target, this.propName, i)) {
                                field.inputsIndex['$'] = i;
                            }
                            else if (hasMeta(GraphQl.Param, this.target, this.propName, i)) {
                                let paramMeta = getMeta(GraphQl.Param, this.target, this.propName, i)!;
                                field.inputsIndex[paramMeta.name || param.name] = i;
                                if (generateInputs) {
                                    field.inputs![paramMeta.name || param.name] = { index: i, type: this.paramTypes ? this.paramTypes[i] : String, default: param.value, required: !param.hasDefault };
                                }
                            }
                        } else {
                            Inject()(this.target.prototype, this.propName, i);
                        }
                        i++;
                    }
                    else {
                        if (!param.name.startsWith('$')) {            
                            Inject()(this.target.prototype, this.propName, i);
                            i++;
                            continue;
                        }

                        let name = param.name.substr(1);
                        field.inputsIndex[name] = i;
                        
                        if (generateInputs && !name.startsWith('$')) {
                            field.inputs![name] = { index: i, type: this.paramTypes ? this.paramTypes[i++] : String, default: param.value, required: !param.hasDefault };
                        }
                    }
                }
            }
        }

        if (this.returnType === undefined && this.propType === Function && !field.type) {
            throw Error(`Return type of Graphql Field "${this.target.name}.${this.propName}" must be declared explicity`);
        }

        return { type: this.returnType || this.propType, name: this.propName, ...field };
    }, 'graphql:field', false),

    FieldDirective: function (directive: string) {
        return function FieldDirective(...params: any) {
            return function (target: any, prop: any) {
                $$FieldDirective(directive, params)(target, prop);
            }
        }
    },

    Directive: function DirectiveDecorator(options: DirectiveDecoratorOptions = {}) {
        return (target: any, prop: any, desc: any) => {
            
            if (Decorator.getType(target, prop, desc) != Decorator.Type.Method) 
                throw TypeError(`Directive only allowed for class methods`);

                if (!is.Function(target))
                throw TypeError(`Directive only allowed for static methods`);

            let resolver = target[prop];

            $$Directive(options)(target, prop);

            target[prop] = GraphQl.FieldDirective(resolver);

            return target;

        }
    } as any as typeof $$Directive
}

GraphQl.Directive.prototype.key = $$Directive.prototype.key;
GraphQl.FieldDirective.prototype.key = $$FieldDirective.prototype.key;