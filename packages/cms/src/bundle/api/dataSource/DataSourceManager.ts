import { Connection, ConnectionManager, MongoEntityManager, SelectQueryBuilder, EntitySchema } from '@azera/stack';
import { Model } from '../model/Model';
import { ModelManager } from '../model/ModelManager';

// let cm = new ConnectionManager

// let s = new EntitySchema({
//     name: 'User',
//     tableName: 'Member',
//     schema: 'CM',
//     columns: {
//         Id: {
//             name: 'Id',
//             type: 'int',
//             primary: true,
//             generated: true,
//             generatedType: 'STORED'
//         },
//         Username: {
//             name: 'Username',
//             type: 'varchar',
//             length: 50
//         }
//     },
//     type: 'regular',
//     target: class User {},
//     synchronize: true
// });

// cm.create({
//     name: 'mssql',
//     host: '127.0.0.1',
//     database: 'ODCC_NEW',
//     type: 'mssql',
//     username: 'mdzzohrabi',
//     password: 'md#1372#',
//     entities: [s]
// });

// cm.get('mssql').connect().then(async connection => {
//     await connection.synchronize(false);

//     console.log(await connection.manager.find(s));

//     let result = await connection.query(`SELECT * FROM CM.[User]`);
//     console.log(result);

//     await connection.close();
// });

export class ModelDataSource {

    private schemas: { [name: string]: EntitySchema } = {};

    constructor(public modelManager: ModelManager, public connectionManager: ConnectionManager) {
    }

    getModel(modelName: string) {
        return this.modelManager.get(modelName)!;
    }

    getConnection(model: string) {
        return this.connectionManager.get( this.getModel(model).dataSource );
    }

    createQueryBuilder<T>(model: string, alias: string): Promise<SelectQueryBuilder<T>>
    createQueryBuilder<T>(connection: Connection, model: string, alias: string): SelectQueryBuilder<T>
    createQueryBuilder(...args: any[])
    {
        let connection!: Connection;
        let model: string;
        let alias: string;
        if (args.length == 3) [connection, model, alias] = args;
        else [model, alias] = args;

        if (!connection) {
            return this.getConnection(model).connect().then(connection => {
                return connection.createQueryBuilder().from( this.getModel(model).collection!, alias);
            });
        }

        return connection.createQueryBuilder().from( this.getModel(model).collection!, alias);
    }

    getModelSchema(modelName: string) {
        let model = this.getModel(modelName);

        if (this.schemas[model.name]) return this.schemas[model.name];

        let schema = new EntitySchema({
            name: model.name,
            columns: model.fields,
            tableName: model.collection,
        });

        this.schemas[model.name] = schema;

        let conn = this.getConnection(modelName);
        conn.options.entities = [ ...(conn.options.entities || []) , schema ];
        conn.buildMetadatas();

        return schema;
    }

    getRepository(modelName: string) {
        return this.getConnection(modelName).getRepository( this.getModelSchema(modelName) );
    }

    isMongo(manager: any): manager is MongoEntityManager {
        return manager instanceof MongoEntityManager || manager.connection.options.type == 'mongodb';
    }

    async select(modelName: string, query: ModelSelectQuery = {}) {

        let model = this.getModel(modelName);
        let connection = this.getConnection(modelName);
            query = this.prepareSelectQuery(model, query);

        // MongoDB
        if (this.isMongo(connection.manager)) {
            
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