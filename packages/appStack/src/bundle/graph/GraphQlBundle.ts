import { Container, Inject } from '@azera/container';
import { is } from '@azera/util';
import { Bundle } from '../../Bundle';
import { ConfigSchema } from '../../ConfigSchema';
import { Kernel } from '../../Kernel';
import { invariant } from '../../Util';
import { HttpBundle } from '../http';
import { GraphQlBuilder } from './GraphQlBuilder';

interface IGraphQlBundleConfig {
    nodes: {
        [name: string]: {
            path?: string
            types?: string[]
            enabled?: boolean
            playground?: boolean
            debug?: boolean,
            maxFileSize?: number
            context?: Function
        }
    }
}

export class GraphQlBundle extends Bundle {

    static bundleName = "GraphQl";

    @Inject() init(config: ConfigSchema) {

        config
            .node('graphql', { description: 'GraphQl bundle configuration' })
            .node('graphql.nodes', { description: 'GraphQl nodes', type: 'object' })
            .node('graphql.nodes.*', { description: 'GraphQl Node', type: 'object' })
            .node('graphql.nodes.*.path', { description: 'GraphQl Node Path (default: "/graphql")', type: 'string' })
            .node('graphql.nodes.*.types', { description: 'GraphQl Defined Types', type: 'array' })
            .node('graphql.nodes.*.types.*', { description: 'GraphQl Defined Type', type: 'string' })
            .node('graphql.nodes.*.enabled', { description: 'GraphQl Node Enable/Disable (default: true)', type: 'boolean' })
            .node('graphql.nodes.*.playground', { description: 'GraphQl Playground', type: 'boolean' })
            .node('graphql.nodes.*.debug', { description: 'GraphQl Debug', type: 'boolean' })
            .node('graphql.nodes.*.maxFileSize', { description: 'GraphQl Max File Size', type: 'number' })
            .node('graphql.nodes.*.context', { description: 'GraphQl Context', type: 'string' })

    }

    @Inject() async boot(container: Container) {

        let config: IGraphQlBundleConfig = container.getParameter('config', {})?.graphql;

        if (config?.nodes) {
            for (let name in config.nodes) {
                let node = config.nodes[name];
                if (node.enabled === false) continue;
                invariant((node.types ?? []).length > 0, `GraphQl Node "${name}" has no types`);               

                container.set(`graphql_node_${name}`,{
                    tags: [ HttpBundle.DI_TAG_MIDDLEWARE ],
                    factory: async function graphqlNodeMiddleware() {
                        let builder = await container.invokeAsync(GraphQlBuilder);
                        let kernel = await container.invokeAsync(Kernel);
                        let { ApolloServer } = await import('apollo-server-express');

                        // Build GraphQl Schema
                        let schema = await builder.buildSchema(
                            ...(node.types?.map(type => is.String(type) ? kernel.use(type) : type) ?? [])
                        );

                        // GraphQl Context
                        let context = is.String(node.context) ? kernel.use(node.context) as Function : (node.context ?? {});

                        let nodeApp = new ApolloServer({
                            schema,
                            playground: node.playground ?? false,
                            debug: node.debug,
                            uploads: { maxFileSize: node.maxFileSize },
                            context
                        })

                        return nodeApp.getMiddleware({
                            path: node.path
                        });
                    }
                })
            }
        }

    }


}