import { EntityManager, ConnectionManager, EntitySchema, ConnectionOptions } from 'typeorm';
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

export class DataSourceManager extends ConnectionManager {

    constructor(
        public readonly modelManager: ModelManager,
        connections?: ConnectionOptions[])
    {
        super();
        (connections || []).forEach(connection => this.create(connection));
    }

    buildEntities() {
        this.modelManager.forEach(model => {
            
            let connection = this.get(model.dataSourceName);
            console.log(connection.driver.dataTypeDefaults, connection.driver.mappedDataTypes)
            let columns = model.fields.map(field => {
                return connection.driver.normalizeType({
                    type: field.type
                })
            });

            console.log(columns);

        });
    }
}

let models = new ModelManager([
    {
        name: 'User',
        fields: [
            {
                name: 'Username',
                type: 'string'
            }
        ],
        dataSourceName: 'mssql'
    }
]);

let ds = new DataSourceManager(models, [
    { name: 'mssql', host: '127.0.0.1', username: 'mdzzohrabi', password: 'md#1372#', type: 'mssql', database: 'ODCC_NEW' }
]);

function extract() {

}

['2']::extract();

ds.buildEntities();