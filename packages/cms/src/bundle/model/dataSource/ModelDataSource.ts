import { Connection, ORM } from '@azera/stack';
import { Model } from '../Model';
import { ModelManager } from '../ModelManager';

/**
 * Model data source manager
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class ModelDataSource {

    /** generated entity schemas from models */
    private schemas: { [name: string]: ORM.EntitySchema } = {};

    constructor(public modelManager: ModelManager, public connectionManager: ORM.ConnectionManager) {}

    /**
     * Get a model
     * @param modelName Model name
     */
    getModel(modelName: string) {
        return this.modelManager.get(modelName)!;
    }

    /**
     * Get connection for a model
     * @param model Model name
     */
    getConnection(model: string) {
        return this.connectionManager.get( this.getModel(model).dataSource );
    }

    /**
     * Connect to model connection
     * @param model Model name
     */
    async connnect(model: string) {
        let connection = this.getConnection(model);
        if (!connection.isConnected) await connection.connect();
        return connection;
    }

    /**
     * Create query builder for specified model
     * @param model Model name
     * @param alias Query alias
     */
    createQueryBuilder<T>(model: string, alias: string): Promise<ORM.SelectQueryBuilder<T>>
    createQueryBuilder<T>(connection: Connection, model: string, alias: string): ORM.SelectQueryBuilder<T>
    createQueryBuilder(...args: any[])
    {
        let connection!: Connection;
        let model: string;
        let alias: string;
        if (args.length == 3) [connection, model, alias] = args;
        else [model, alias] = args;

        if (!connection) {
            return this.connnect(model).then(connection => {
                return connection.createQueryBuilder().from( this.getModel(model).collection!, alias);
            });
        }

        return connection.createQueryBuilder().from( this.getModel(model).collection!, alias);
    }

    /**
     * Convert model to entity schema
     * @param modelName Model name
     */
    getModelSchema(modelName: string) {
        let model = this.getModel(modelName);

        if (this.schemas[model.name]) return this.schemas[model.name];

        let schema = new ORM.EntitySchema({
            name: model.name,
            columns: model.fields,
            tableName: model.collection,
        });

        this.schemas[model.name] = schema;

        let conn = this.getConnection(modelName);
        // @ts-ignore
        conn.options.entities = [ ...(conn.options.entities || []) , schema ];
        // @ts-ignore
        conn.buildMetadatas();

        return schema;
    }

    /**
     * Get model repository
     * @param modelName Model name
     */
    getRepository(modelName: string) {
        return this.getConnection(modelName).getRepository( this.getModelSchema(modelName) );
    }

    /**
     * Check if given entity manager is a mongo entity manager
     * @param manager EntityManager
     */
    isMongo(manager: any): manager is ORM.MongoEntityManager {
        return manager instanceof ORM.MongoEntityManager || manager.connection.options.type == 'mongodb';
    }

    /**
     * Select query over a model
     * 
     * @param modelName Model name
     * @param query Query
     */
    async select(modelName: string, query: ModelSelectQuery = {}) {

        let model = this.getModel(modelName);
        let connection = this.getConnection(modelName);
            query = this.prepareSelectQuery(model, query);

        // MongoDB
        if (this.isMongo(connection.manager)) {
            
            if (!connection.isConnected)
                await connection.connect();

            let $project: any = {};
            query.fields!.forEach(field => $project[field] = 1);

            return await connection.manager.queryRunner.aggregate(model.collection!, [
                { $project }
            ]).toArray();
        }
        // RDBMS
        else
        {
            let qb = await this.createQueryBuilder(modelName, 'a');
            return await qb.select(query.fields || []).execute();
        }
    }

    /**
     * Preparation a select query
     * @param model Model
     * @param query Query
     */
    prepareSelectQuery(model: Model, query: ModelSelectQuery) {
        query = query || {};

        if (!query.fields) {
            query.fields = model.fields.map(field => field.name);
        }

        return query;
    }

}

export interface ModelSelectQuery {
    fields?: string[]
    where?: any[]
}