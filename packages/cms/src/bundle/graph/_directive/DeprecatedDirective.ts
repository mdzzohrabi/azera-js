import { SchemaDirectiveVisitor } from 'graphql-tools';
import { GraphQLField } from 'graphql';
import { Directive } from '../decorator/Directive';
import { gql } from 'apollo-server';
import { Container } from '@azera/stack';

@Directive({
    name: 'deprecated',
    typeDef: gql(`
    directive @deprecated(
        reason: String = "No longer supported"
      ) on FIELD_DEFINITION
    `)
})
export class DeprecatedDirective extends SchemaDirectiveVisitor {

    container!: Container;

    visitFieldDefinition(field: GraphQLField<any, any>) {
        field.isDeprecated = true;
        field.deprecationReason = this.args.reason;
    }

}