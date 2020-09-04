import { getClassDecoratedProps, getMeta, hasMeta } from '../../Metadata';
import { invariant } from '../../Util';
import { GraphQl } from './Decorators';

export class GraphQlSDLGenerator {

    toGraphQlType(type: any): string {
        switch (type) {
            case Number: return 'Int';
            case String: return 'String';
            case Boolean: return 'Bool';
            default: {
                if (typeof type == 'function') {                   
                    let meta = getMeta(GraphQl.Type, type);
                    if (meta) {
                        return meta.name;
                    } else {
                        return type.name;
                    }
                }
                return type;
            }
        }
    }

    isValidType(type: any) {
        return hasMeta(GraphQl.Type, type);
    }

    /**
     * Generate GraphQL SDL from Type decorated object
     * @param object Target Type Object
     */
    toSDL(object: any) {
        let type = getMeta(GraphQl.Type, object) as any;
        invariant(type, `Invalid GraphQl Type ${object}`);

        let sdl = `type ${type.name} {`;

        getClassDecoratedProps(object)?.forEach((_, name) => {
            let field = getMeta(GraphQl.Field, object, name);
            if (field && !Array.isArray(field)) {
                if (field.sdl) {
                    sdl += `\n\t${field.sdl}`;
                } else {
                    let inputs = ``;
                    if (Object.keys(field.inputs ?? {}).length > 0) {
                        inputs = `(`;
                        for (let inputName in field.inputs) {
                            let input = field.inputs[inputName];
                            inputs += `${inputName}: ${typeof input == 'string' ? this.toGraphQlType(input) : this.toGraphQlType(input.type) + (input.default ? ' = ' + input.default : '')}`
                        }
                        inputs += `)`;
                    }
                    sdl += `\n\t${field.name}${inputs}: ${this.toGraphQlType(field.type)}${field.description ? ' # ' + field.description : ''}`;
                }
            }
        });

        sdl += `\n}`;

        return sdl;

    }

}