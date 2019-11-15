import { gql } from 'apollo-server';
import { GraphQLObjectType, GraphQLString } from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { Directive } from '../decorator/Directive';
import { Container } from '@azera/stack';
import { ModelManager } from '../../model/ModelManager';
import { Model, ModelField } from '../../model/Model';

@Directive({
    name: 'dataSource',
    typeDef: gql`directive @dataSource(name: String!, connection: String) on OBJECT`
})
export class DataSourceDirective extends SchemaDirectiveVisitor {

    container!: Container;

    typeMapping = {
        String: 'string',
        Int: 'number',
        Boolean: 'boolean'
    } as { [name: string]: string }

    visitObject(object: GraphQLObjectType) {
        let { name: tableName, connection } = this.args;
        let modelManager = this.container.invoke(ModelManager);
        let model: Model = {
            name: object.name,
            collection: tableName,
            dataSource: connection || 'default',
            description: object.description || undefined,
            fields: []
        };

        Object.values(object.getFields()).forEach((field, index, fields) => {
            model.fields.push({
                name: field.name,
                type: this.typeMapping[field.type.toString()] as any,
                description: field.description || undefined
            })
        });

        modelManager.addModel(model);
    }

}

