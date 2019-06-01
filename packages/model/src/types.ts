import { Schema, SchemaTypeOpts, SchemaOptions, Model } from 'mongoose';

export const { ObjectId } = Schema.Types;
export const { Types } = Schema;
export { SchemaOptions };

export function isModel(value): value is Model<any> {
    return value instanceof Model;
}

export interface IFieldSchema extends SchemaTypeOpts<any> {}