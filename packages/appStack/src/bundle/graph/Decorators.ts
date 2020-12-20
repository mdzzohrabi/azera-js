import { Decorator, Inject } from '@azera/container';
import { getParameters } from '@azera/reflect';
import { is } from '@azera/util';
import { createDecorator } from '../../Metadata';

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

export const GraphQl = {

    /**
     * Graphql Type resolver decorator
     */
    Type: createDecorator(function (type: TypeDecoratorOptions = {}) {
        return { type: 'type', name: this.target.name, ...type };
    }, 'graphql:type', false),

    Input: createDecorator(function (input: TypeDecoratorOptions = {}) {
        return { type: 'input', name: this.target.name, ...input };
    }, `graphql:input`, false),
    
    /**
     * Graphql Field resolver decorator
     */
    Field: createDecorator(function (field?: string | FieldDecoratorOptions) {

        if (!field) field = {};

        if (typeof field == 'string') {
            field = { typeDef: field, inputs: {} };
        }
        else if (this.propName && is.Function(this.target.prototype[this.propName])) {
            let params = getParameters(this.target.prototype[this.propName], false);

            if (params) {
                field.inputsIndex = {};
                
                let generateInputs = !field.inputs;
                if (generateInputs) {
                    field.inputs = {};
                }

                let i = 0;
                for (let param of params) {
                    if (!param.name.startsWith('$')) {            
                        Inject()(this.target.prototype, this.propName, i);
                        i++;
                        continue;
                    }

                    let name = param.name.substr(1);

                    field.inputsIndex[name] = i;

                    if (generateInputs) {
                        field.inputs![name] = { index: i, type: this.paramTypes ? this.paramTypes[i++] : String, default: param.value, required: !param.hasDefault };
                    }
                }
            }
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