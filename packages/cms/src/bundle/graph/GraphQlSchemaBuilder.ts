import { invariant } from '@azera/stack';
import { gql, DirectiveResolverFn } from 'apollo-server';

/**
 * GraphQL Schema builder
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class GraphQlSchemaBuilder {

    /** Defined types */
    public types: HashTable<TypeNode> = {};

    /** Defined directives */
    public directives: HashTable<DirectiveNode> = {};

    directive(name: string, node: DirectiveNode) {
        this.directives[name] = node;
        return this;
    }

    /**
     * Add new type
     * 
     * @param type Type name
     * @param node Node options
     */
    add(type: string, node: TypeNode) {
        invariant(this.types[type] === undefined, 'Type %s already exists', type);
        invariant(!!node && !!node.fields && Object.keys(node.fields).length > 0, 'No fields declared for type %s', type);
        this.types[type] = node;
        return this;
    }

    /** Extend Type */
    extend(type: string, fields: HashTable<FieldTypeNode>) {
        let node = this.types[type] || { fields: {} };
        this.types[type] = node;
        invariant(!!fields || Object.keys(fields).length == 0, 'No fields declared for type %s', type);
        node.fields = { ...node.fields , ...fields };
        return this;
    }
    
    addField(type: string, fieldName: string, fieldType: string, resolver?: Function) {
        this.extend(type, {
            [fieldName]: { type: fieldType, resolver }
        });
        return this;
    }

    toString() {
        let result = '';
        for (let typeName in this.types) {
            let type = this.types[typeName];
            if (type.description) {
                if (type.description.includes("\n")) {
                    result += `"""\n${ type.description }\n"""\n`;
                } else {
                    result += `"${type.description}"\n`;
                }
            }
            result += `type ${typeName} {\n`;
            for (let fieldName in type.fields) {
                let field = type.fields[fieldName];

                if (field.description) {
                    if (field.description.includes("\n")) {
                        result += `\t"""\n${ field.description.split("\n").map(line => `\t${line}`).join("\n") }\n"""\n`;
                    } else {
                        result += `\t"${field.description}"\n`;
                    }
                }

                let parameters: string[] = [];

                if (field.parameters) {
                    Object.keys(field.parameters).map(param => {
                        parameters.push(`${param}: ${field.parameters![param]}`)
                    });
                }

                result += `\t${ fieldName }${ parameters.length > 0 ? `(${ parameters.join(', ') })` : '' }: ${ field.type }\n`;
            }
            result += `}\n\n`;
        }

        for (let directiveName in this.directives) {
            let directive = this.directives[directiveName];
            if (directive.typeDef) {
                result += directive.typeDef + "\n\n";
            } else {
                result += `directive @${directiveName} on FIELD_DEFINITION\n\n`;
            }
        }

        return result;
    }

    toResolvers() {
        let resolvers: HashTable<HashTable<Function>> = {};

        for (let typeName in this.types) {
            let type = this.types[typeName];
            resolvers[typeName] = {};
            for (let fieldName in type.fields) {
                let field = type.fields[fieldName];
                if (typeof field.resolver == 'function')
                    resolvers[typeName][fieldName] = field.resolver;
            }
        }

        return resolvers;
    }

    build() {

        let directiveResolvers = {} as any;

        Object.keys(this.directives).map(name => {
            directiveResolvers[name] = this.directives[name].resolver;
        });

        return {
            typeDefs: this.toString() != '' ? gql(this.toString()) : '',
            resolvers: this.toResolvers(),
            directiveResolvers
        }
    }

}

export interface DirectiveNode {
    resolver: DirectiveResolverFn
    typeDef?: string
}

export interface TypeNode {
    fields: HashTable<FieldTypeNode>
    description?: string
}

export interface FieldTypeNode {
    type: string,
    description?: string
    resolver?: Function
    parameters?: HashTable<string | FieldParemeter>
};

export interface FieldParemeter {

}

export type HashTable<T> = { [name: string]: T }