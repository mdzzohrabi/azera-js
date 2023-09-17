import type { ApolloServer, ApolloServerOptions, BaseContext, GraphQLRequest } from "@apollo/server";
import is, { HashMap } from "@azera/util/is";

/**
 * GraphQl Manager
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class GraphQlManager {

    public nodes: HashMap<() => ApolloServer | Promise<ApolloServer>> = {};

    protected isServerConfig(value: any): value is ApolloServerOptions<BaseContext> {
        return is.Object(value) && 'schema' in value;
    }

    /**
     * Add new apollo server node
     * @param nodeName Node name
     * @param node ApolloServer node
     */
    public addNode(nodeName: string, node: ApolloServer | (() => ApolloServer | Promise<ApolloServer>) | ApolloServerOptions<BaseContext>) {
        if (this.isServerConfig(node)) {
            let config = { ...node } as ApolloServerOptions<BaseContext>;
            node = () => this.createServer(config);
        }
        return this.nodes[nodeName] = is.Function(node) ? node : () => node as ApolloServer;
    }

    /**
     * Get an apollo server node
     * @param nodeName Node name
     */
    public getNode(nodeName: string) {
        if (!this.nodes[nodeName]) throw Error(`GraphQl Node "${nodeName}" not found`);
        return this.nodes[nodeName]?.call(this);
    }

    /**
     * Execute a graphql request
     * @param nodeName Node name
     * @param request Request
     */
    public async execute(nodeName: string, request: GraphQLRequest, options = { throwError: true }) {
        let node = await this.getNode(nodeName);
        let result = await node.executeOperation(request);
        if (options.throwError && result.http.status != 200) {
            throw new Error(result.body.toString());
        }
        return result;
    }

    public async createServer(config: ApolloServerOptions<BaseContext>) {
        let { ApolloServer } = await import('@apollo/server');
        let server = new ApolloServer(config);
        return server;
    }

}