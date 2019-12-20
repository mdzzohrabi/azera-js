import { gql } from 'apollo-server';
import { GraphQLField } from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { Directive } from '../decorator/Directive';
import { Container } from '@azera/stack';

@Directive({ name: 'upper', typeDef: gql`directive @upper on FIELD | FIELD_DEFINITION` })
export class UpperDirective extends SchemaDirectiveVisitor {

    container!: Container;

    visitFieldDefinition(field: GraphQLField<any, any>) {
        let resolver = field.resolve;
        
        field.resolve = (...params) => {
            console.log('as');
            return resolver ? resolver(...params).toString().toUpperCase() : undefined;
        };
    }

}