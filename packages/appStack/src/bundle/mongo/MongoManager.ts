import type { Map } from "@azera/util";
import type { MongoClient } from "mongodb";

export class MongoManager {

    connections: Map<() => Promise<MongoClient>> = {};

    public has(connectionName: string) {
        return this.connections[connectionName] !== undefined;
    }
    
    public get(connectionName: string): Promise<MongoClient> {
        return this.connections[connectionName]();
    }

    public add(connectionName: string, connectionBuilder: () => Promise<MongoClient>) {
        this.connections[connectionName] = connectionBuilder;
    }

}