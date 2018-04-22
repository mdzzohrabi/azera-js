import { Meta } from "./meta";
import { Model as MongooseModel, Document, model, Schema } from "mongoose";
import { Constructor } from "@azera/util/types";
import * as mongoose from "mongoose";

let models = {};

export type Methods<R> = { [K in keyof R]: R[K] extends Function ? K : never }[keyof R];
export type OnlyMethods<R> = Pick<R, Methods<R>>;

export type IModel<M, R> = MongooseModel<Document & M & OnlyMethods<R>> & R;

export function toModel<O, T extends Function>(modelClass: Constructor<O>, repository?: T): IModel<O, T> {

    // Assert model is class
    if ( !(modelClass instanceof Function) ) throw TypeError(`modelClass must be a Class, ${ typeof modelClass } given`);

    // Cache models
    if (models[modelClass.name]) return models[modelClass.name];

    // Get model decorated definition
    let definition = modelClass[ Meta.Definition ];

    // Assert has definition
    if ( !definition ) throw Error(`No definition found`);

    // Get Schema decorator from repository
    let schemaOptions = repository && repository[Meta.Schema] || modelClass[Meta.Schema] || {};

    // Create mongoose schema from definition
    let schema = new Schema(definition, schemaOptions);

    // Load model class
    schema.loadClass(modelClass);
    // Load repository class
    repository && schema.loadClass(repository);

    // Create model and cache it by its name
    return models[ modelClass.name ] = model(modelClass.name, schema) as any;
}


export class Model<T> extends MongooseModel {
    // static getModel() {
    //     return toModel(this);
    // }
}


export { mongoose };