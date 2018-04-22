import 'reflect-metadata';
import { Meta } from "./meta";
import { IFieldSchema, SchemaOptions, ObjectId } from "./types";

function getOrCreate <T>(object, key, defaults: T): T {
    return ( object[key] || ( object[key] = defaults ) );
}

function setModelDefinition(model: Function, field: string, options: IFieldSchema) {
    let def = getOrCreate(model, Meta.Definition, {});
    def[ field ] = Object.assign(def[field] || {}, options || {});
    return def;
}

export function Schema(options?: SchemaOptions) {
    return (target) => {
        getOrCreate(target, Meta.Schema, options);
    };
}

export function Field( options: IFieldSchema = {} ): PropertyDecorator {
    return ( target, propertyKey: string ) => {

        let reflectType = Reflect.getMetadata("design:type", target, propertyKey);

        if (!reflectType) {
            throw Error(`Please enable emitDecoratorMetadata option in your tsconfig.json`);
        }

        setModelDefinition(target.constructor, propertyKey, {
            type: reflectType,
            ...( options || {} )
        });
    };
}

export function Required() {
    return (target, key: string) => { setModelDefinition(target.constructor, key, { required: true }); };
}

export function Default(defaultValue) {
    return (target, key: string) => { setModelDefinition(target.constructor, key, { default: defaultValue }); };
}

export function CollectionOf(model: string | Function) {
    let name = model['modelName'] || model['name'] || model;
    return (target, key: string) => { setModelDefinition(target.constructor, key, { type: [{ type: ObjectId, ref: name }] }); };
}
