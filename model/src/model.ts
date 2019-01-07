import { Meta } from "./meta";
import { Model as MongooseModel, Document, model, Schema } from "mongoose";
import { Constructor } from "@azera/util/types";
import * as mongoose from "mongoose";
import { createSchema } from './schema';

let models = {};

export type Methods<R> = { [K in keyof R]: R[K] extends Function ? K : never }[keyof R];
export type OnlyMethods<R> = Pick<R, Methods<R>>;

export type IModel<M, R> = MongooseModel<Document & M & OnlyMethods<R>> & R;

export function toModel<O, T extends Function>(modelClass: Constructor<O>, repository?: T): IModel<O, T> {

    // Assert model is class
    if ( !(modelClass instanceof Function) ) throw TypeError(`modelClass must be a Class, ${ typeof modelClass } given`);

    // Cache models
    if (models[modelClass.name]) return models[modelClass.name];

    let schema = createSchema(modelClass, repository);
    
    // Create model and cache it by its name
    return models[ modelClass.name ] = model(modelClass.name, schema) as any;
}


export class Model<T> extends MongooseModel {
    // static getModel() {
    //     return toModel(this);
    // }
}


export { mongoose };