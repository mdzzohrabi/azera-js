import { createDecorator } from '../../Metadata';
import { MongooseUtil } from './MongooseUtil';

export let MongooseSchema = {

    Prop: createDecorator(function (this: any, name?: string, type?: any) { return {name: name ?? this.propName, type: type ?? this.propType}; }, 'schema:prop', false),
    Required: createDecorator((value?: boolean) => ({ required: value ?? true }), 'schema:required', false),
    Unique: createDecorator((value?: boolean) => ({ unique: value ?? true }), 'schema:unique', false),
    Enum: createDecorator(items => ({ enum: items }), 'schema:enum', false),
    Type: createDecorator((type: any) => ({ type }), 'schema:type', false),
    Default: createDecorator(value => ({ default: value }), 'schema:default', false),
    Index: createDecorator((value?: boolean) => ({ index: value ?? true}), 'schema:index', false),
    Ref: createDecorator(function (this: any, model) {
        let isArray = this.propType == Array;

        return isArray ? [{ type: require('mongoose').Schema.Types.ObjectId, ref: model }] : { type: require('mongoose').Schema.Types.ObjectId, ref: model };
    }, 'schema:ref', false),
    Schema: createDecorator(function (this: any, modelName?: string, collection?: string) {
        return {
            modelName: modelName ?? this.target.name,
            collection
        }
    }, 'schema', false),
    Embed: createDecorator(function (document: any) {
        return MongooseUtil.toSchemaDefinition(document);
    }, 'schema:embed', false)

}