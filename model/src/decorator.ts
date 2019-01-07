import 'reflect-metadata';
import { Meta } from "./meta";
import { IFieldSchema, SchemaOptions, ObjectId, isModel } from "./types";
import { Model, Schema as MongooseSchema } from 'mongoose';
import { createSchema } from './schema';

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

export function Required(): PropertyDecorator {
    return (target, key: string) => { setModelDefinition(target.constructor, key, { required: true }); };
}

export function Default(defaultValue): PropertyDecorator {
    return (target, key: string) => { setModelDefinition(target.constructor, key, { default: defaultValue }); };
}

export function Relation(model: string | Function | object, { many = false, subDoc = false } = {}): PropertyDecorator {
    return (target, key: string) => {
        let name = model['modelName'] || model['name'] || model;
        let type: any = { type: ObjectId, ref: name };
        if ( subDoc ) {
            if ( isModel(model) )
                type = model.schema;
            else if ( model instanceof MongooseSchema ) {
                type = model;
            }
            else {
                type = createSchema(model as any);
            }
        }
        if ( many ) type = [ type ];
        setModelDefinition(target.constructor, key, { type });
    };
}

export function hasOne(model: string | Function, { subDoc = false } = {}) {
    return Relation(model, { many: false, subDoc });
}

export function hasMany(model: string | Function, { subDoc = false } = {}) {
    return Relation(model, { many: true, subDoc });
}

export function CollectionOf(model: string | Function): PropertyDecorator {
    return hasMany(model);
}