import { createDecorator } from '../../Metadata';
import { getParameters } from '@azera/reflect';

export const GraphQl = {

    Type: createDecorator(function (type?: { name?: string, sdl?: string }) {
        return { name: this.target.name, ...type };
    }, 'graphql:type', false),
    
    Field: createDecorator(function (field?: string | { name?: string, type?: any, inputs?: { [name: string]: any | { type: any, required: boolean, default: string } }, description?: string, deprecatedMessage?: string, sdl?: string }) {
        if (!field) field = {};
        if (typeof field == 'string') field = { sdl: field };

        if (this.propName && !field.inputs && this.target.prototype[this.propName] instanceof Function) {            
            let params = getParameters(this.target.prototype[this.propName], false);
            if (params) {
                if (!field.inputs) field.inputs = {};
                let i = 0;
                for (let param of params) {
                    field.inputs[param.name] = { type: this.paramTypes ? this.paramTypes[i++] : String, default: param.value };
                }
            }
        }
        

        return { type: this.returnType || this.propType, name: this.propName, ...field };
    }, 'graphql:field', false)

}
