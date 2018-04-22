import { Schema, SchemaTypeOpts, SchemaOptions } from 'mongoose';

export const { ObjectId } = Schema.Types;
export const { Types } = Schema;
export { SchemaOptions };

export interface IFieldSchema extends SchemaTypeOpts<any> {}