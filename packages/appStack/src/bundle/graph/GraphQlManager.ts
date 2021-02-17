import is, { HashMap } from "@azera/util/is";
import type { ApolloServer, ApolloServerExpressConfig } from "apollo-server-express";
import type { GraphQLRequest } from "apollo-server-types";

/**
 * GraphQl Manager
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class GraphQlManager {

    public nodes: HashMap<() => ApolloServer | Promise<ApolloServer>> = {};

    protected isServerConfig(value: any): value is ApolloServerExpressConfig {
        return is.Object(value) && 'schema' in value;
    }

    /**
     * Add new apollo server node
     * @param nodeName Node name
     * @param node ApolloServer node
     */
    public addNode(nodeName: string, node: ApolloServer | (() => ApolloServer | Promise<ApolloServer>) | ApolloServerExpressConfig) {
        if (this.isServerConfig(node)) {
            let config = { ...node } as ApolloServerExpressConfig;
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
        if (options.throwError && result.errors) {
            throw new Error(result.errors.toString());
        }
        return result;
    }

    public async createServer(config: ApolloServerExpressConfig) {
        let { ApolloServer } = await import('apollo-server-express');
        let server = new ApolloServer(config);
        return server;
    }

}