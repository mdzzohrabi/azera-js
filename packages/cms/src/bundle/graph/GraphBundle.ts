import { Bundle, ConfigSchema, Container, forEach, Inject, Logger } from '@azera/stack';
import { RunGraphQlCommand } from './command/RunGraphQlCommand';
import { CoreGraphQlExtension } from './extension/CoreGraphQlExtension';
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

    @Inject() async init(container: Container, config: ConfigSchema) {

        let { ApolloServer, makeExecutableSchema } = await import('apollo-server');
        let { GraphQLSchema } = await import('graphql');
        let { default: CoreDirectives } = await import('./directive');
        let { GraphQlExtension } = await import('./extension/GraphQlExtension');
        let { GraphQlSchemaBuilder } = await import('./GraphQlSchemaBuilder');

        // Configuration
        config
        .node('graph')
        .node('graph.port', { type: 'number', description: 'GraphQl port', default: 1234 })

        // Inject Container to CoreDirectives
        forEach(CoreDirectives, directive => {
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
            container.getByTag<import('./extension/GraphQlExtension').GraphQlExtension>(GraphBundle.DI_GRAPHQL_EXTENSION).forEach(extension => {
                extension.build(schemaBuilder);
            });


            directives.forEach(directive => {
                let _class = directive as import('./decorator/Directive').DirectiveClass | undefined;
                schemaDirectives[_class!.directiveName] = _class;
            });

            let schemaBuilderScheme = schemaBuilder.build();

            let schema = makeExecutableSchema({
                typeDefs: [ require('./Schema').default, ...directives.map(directive => (directive as import('./decorator/Directive').DirectiveClass | undefined)!.typeDef), schemaBuilderScheme.typeDefs ],
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

    @Inject() async run( container: Container, command: string) {
        if (command == 'graphql') {
            let { ApolloServer } = await import('apollo-server');

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