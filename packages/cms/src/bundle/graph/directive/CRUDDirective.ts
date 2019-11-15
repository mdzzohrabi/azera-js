import { Container } from '@azera/stack';
import { gql } from 'apollo-server';
import { GraphQLObjectType } from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { Directive } from '../decorator/Directive';

@Directive({
    name: 'crud',
    typeDef: gql`directive @crud on OBJECT`
})
export class CRUDDirective extends SchemaDirectiveVisitor {

    container!: Container;

    visitObject(object: GraphQLObjectType) {
    }

}