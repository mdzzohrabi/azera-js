import { Constructor } from '@azera/util';
import { getClassDecoratedProps, getMeta } from '../../Metadata';
import { MongooseSchema } from './Decorators';
import type { Model, Document } from 'mongoose';

let { Schema } = MongooseSchema;

export type Methods<R> = { [K in keyof R]: R[K] extends Function ? K : never }[keyof R];
export type OnlyMethods<R> = Pick<R, Methods<R>>;
export type IModel<M, R> = Model<Document & M & OnlyMethods<R>> & R;

export class MongooseUtil {

    static toSchemaDefinition(object: any) {
        let definition = {} as any;
        let props = getClassDecoratedProps(object as any);

        if (!props) throw Error(`Invalid mongoose schema ${object}`);

        props.forEach((metas, prop) => {
            let schemaProp: any = { type: String };
            metas.forEach((value, name) => {
                if (name.startsWith('schema:')) {
                    if (Array.isArray(value)) schemaProp = value;
                    else schemaProp = { ...schemaProp, ...value };
                }
            });
            definition[prop] = schemaProp;
        });

        return definition;
    }

    static newModel<O, R extends Function>(object: Constructor<O>): IModel<O, {}>
    static newModel<O, R extends Function>(object: Constructor<O>, repository?: R): IModel<O, R>
    {
        let schemaMeta = getMeta(Schema, object as any);
        if (Array.isArray(schemaMeta)) throw Error(`Schema decorator cannot be duplicated`);
        if (!schemaMeta?.modelName) throw Error(`Schema modelName not defined`);

        let schema = new (require('mongoose').Schema)(MongooseUtil.toSchemaDefinition(object), schemaMeta);
        schema.loadClass(object);
        repository && schema.loadClass(repository);

        return require('mongoose').model(schemaMeta.modelName, schema) as any;
    }

}