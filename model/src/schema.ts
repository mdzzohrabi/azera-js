import { Constructor } from '@azera/util/types';
import { Schema } from 'mongoose';
import { Meta } from './meta';

export function createSchema<O, T extends Function>(modelClass: Constructor<O>, repository?: T) {

    // Assert model is class
    if ( !(modelClass instanceof Function) ) throw TypeError(`modelClass must be a Class, ${ typeof modelClass } given`);

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

    return schema;
    
}