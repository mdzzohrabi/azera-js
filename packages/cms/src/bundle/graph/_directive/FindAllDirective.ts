import { Container } from '@azera/stack';
import { gql, SchemaError } from 'apollo-server';
import { GraphQLField, GraphQLList, GraphQLObjectType } from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { ModelDataSource } from '../../model/dataSource/ModelDataSource';
import { Directive } from '../decorator/Directive';

@Directive({
    name: 'findAll',
    typeDef: gql`directive @findAll on FIELD_DEFINITION`
})
export class FindAllDirective extends SchemaDirectiveVisitor {

    container!: Container;

    visitFieldDefinition(field: GraphQLField<any, any, any>, details: any) {

        if (!(field.type instanceof GraphQLList)) {
            throw new SchemaError(`findAll only works with list return type`);
        }

        let model = field.type.ofType;
        let defaultResolver = field.resolve;
        let container = this.container;

        if (!(model instanceof GraphQLObjectType)) {
            throw new SchemaError(`${model} is not an appropriate model type`);
        }

        field.resolve = function findAllResolver(parent, args, context) {
            return container.invoke(ModelDataSource).select(model.name);
        }       
    }

}