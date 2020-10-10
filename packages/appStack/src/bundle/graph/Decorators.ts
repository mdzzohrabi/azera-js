import { createDecorator, getMeta } from '../../Metadata';
import { getParameters } from '@azera/reflect';

export interface TypeDecoratorOptions {
    name?: string
    sdl?: string
}

export interface FieldDecoratorOptions {
    name?: string
    type?: any
    inputs?: {
        [name: string]: any | { type: any, required?: boolean, default?: string }
    }
    description?: string
    deprecatedMessage?: string
    sdl?: string
    inputsIndex?: { [name: string]: number }
}

export const GraphQl = {

    /**
     * Graphql Type resolver decorator
     */
    Type: createDecorator(function (type?: TypeDecoratorOptions) {
        return { name: this.target.name, ...type };
    }, 'graphql:type', false),
    
    /**
     * Graphql Field resolver decorator
     */
    Field: createDecorator(function (field?: string | FieldDecoratorOptions) {
        if (!field) field = {};

        if (typeof field == 'string') {
            field = { sdl: field, inputs: {} };
        }
        else if (this.propName && this.target.prototype[this.propName] instanceof Function) {            
            let params = getParameters(this.target.prototype[this.propName], false);

            if (params) {
                field.inputsIndex = {};
                
                let generateInputs = !field.inputs;
                if (generateInputs) {
                    field.inputs = {};
                }

                let i = 0;
                for (let param of params) {
                    if (param.name.startsWith('_')) { i++; continue; }

                    field.inputsIndex[param.name] = i;

                    if (generateInputs) {
                        field.inputs![param.name] = { type: this.paramTypes ? this.paramTypes[i++] : String, default: param.value };
                    }
                }
            }
        }

        return { type: this.returnType || this.propType, name: this.propName, ...field };
    }, 'graphql:field', false)

}
