import { Bundle, ConfigSchema, Container, Inject, Logger } from '@azera/stack';
import { ApolloServer, makeExecutableSchema } from 'apollo-server';
import { RunGraphQlCommand } from './command/RunGraphQlCommand';
import { DirectiveClass } from './decorator/Directive';
import * as CoreDirectives from './directive';
import { CoreGraphQlExtension } from './extension/CoreGraphQlExtension';
import { GraphQlExtension } from './extension/GraphQlExtension';
import { GraphQlSchemaBuilder } from './GraphQlSchemaBuilder';
import * as g from 'graphql/execution/execute';
import { GraphQLSchema } from 'graphql';

/**
 * Graph bundle
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 * @bundle GraphBundle
 */
export class GraphBundle extends Bundle {

    /** Graphql SchemaDirectiveVisitor DI tag */
    static DI_GRAPHQL_DIRECTIVE = 'graphql.directive';

    /** Graphql extension DI tag */
    static DI_GRAPHQL_EXTENSION = 'graphql.extension';

    static bundleName = "Graph";
    static version = "1.0.0";

    getServices() {
        return [RunGraphQlCommand, CoreGraphQlExtension];
    }

    init(@Inject() container: Container, @Inject() config: ConfigSchema) {

        // Configuration
        config
        .node('graph')
        .node('graph.port', { type: 'number', description: 'GraphQl port', default: 1234 })

        // Inject Container to CoreDirectives
        Object.values(CoreDirectives).forEach(directive => {
            directive.prototype.container = container;
        });

        container
        .autoTag(GraphQlExtension, [ GraphBundle.DI_GRAPHQL_EXTENSION ])
        .add(...Object.values(CoreDirectives))
        // GraphQl server factory
        .setFactory(GraphQLSchema, function graphqlSchemaFactory() {
            // GraphQl Directives
            let directives = container.findByTag(GraphBundle.DI_GRAPHQL_DIRECTIVE).map(service => service.service);
            let schemaDirectives = {} as any;

            // GraphQl Schema builder
            let schemaBuilder = container.invoke(GraphQlSchemaBuilder);

            // GraphQl Extensions
            container.getByTag<GraphQlExtension>(GraphBundle.DI_GRAPHQL_EXTENSION).forEach(extension => {
                extension.build(schemaBuilder);
            });


            directives.forEach(directive => {
                let _class = directive as DirectiveClass | undefined;
                schemaDirectives[_class!.directiveName] = _class;
            });

            let schemaBuilderScheme = schemaBuilder.build();

            let schema = makeExecutableSchema({
                typeDefs: [ require('./Schema').default, ...directives.map(directive => (directive as DirectiveClass | undefined)!.typeDef), schemaBuilderScheme.typeDefs ],
                directiveResolvers: schemaBuilderScheme.directiveResolvers,
                schemaDirectives,
                resolvers: schemaBuilderScheme.resolvers
            })

            return schema;
        })
        .setFactory(ApolloServer, function graphqlServerFactory() {

            // Create GraphQl instance
            return new ApolloServer({
                schema: container.invoke(GraphQLSchema),
                resolvers: {
                    Query: {
                        hello: (_,__, { container }) => {
                            return 'ASD';
                        }
                    }
                },
                context: () => ({
                    container
                })
            });
        });
       

    }

    async run(
        @Inject() container: Container,
        command: string)
    {
        if (command == 'graphql') {
            let apolloServer = container.invoke(ApolloServer);
            let logger = container.invoke(Logger);

            let {
                port = 1234
            } = container.getParameter('config').graph || {} as any;

            let { url } = await apolloServer.listen({ port });

            logger.info(`Apollo server started on ${url}`);
        }
    }
}