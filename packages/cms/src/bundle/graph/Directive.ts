import { Container } from '@azera/stack';
import { gql, SchemaError } from 'apollo-server';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { Directive } from './decorator/Directive';
import { ModelManager } from '../model/ModelManager';
import { ModelDataSource } from '../model/dataSource/DataSourceManager';
import { Model, ModelField } from '../model/Model';
import { GraphQLField, GraphQLList, GraphQLObjectType } from 'graphql';

export namespace GraphBundle.Directives {

    /**
     * Create/Read/Update/Delete (CRUD) Directive
     */
    @Directive({
        name: 'crud',
        typeDef: gql`directive @crud on OBJECT`
    })
    export class CRUDDirective extends SchemaDirectiveVisitor {
        container!: Container;
    
        visitObject(object: GraphQLObjectType) {}
    }

    /**
     * DataSource directive
     */
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

    /**
     * Deprecated Directive
     */
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
    
    

}

export default GraphBundle.Directives;