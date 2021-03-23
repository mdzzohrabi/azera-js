import type { Map } from "@azera/util";
import type { MongoClient } from "mongodb";

/**
 * Mongo connection manager
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class MongoManager {

    /**
     * Connections
     */
    connections: Map<() => Promise<MongoClient>> = {};

    /**
     * Check connection exists
     * @param connectionName Connection name
     * @returns 
     */
    public has(connectionName: string) {
        return this.connections[connectionName] !== undefined;
    }
    
    /**
     * Get a connection (MongoClient)
     * @param connectionName Connection name
     * @returns 
     */
    public get(connectionName: string): Promise<MongoClient> {
        return this.connections[connectionName]();
    }

    /**
     * Create a new connection
     * @param connectionName Connection name
     * @param connectionBuilder Connection builder function
     */
    public add(connectionName: string, connectionBuilder: () => Promise<MongoClient>) {
        this.connections[connectionName] = connectionBuilder;
    }

}