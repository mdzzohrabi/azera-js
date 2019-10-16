import { Inject, Container } from '@azera/container';
import { Bundle } from '../../Bundle';
import { ConfigSchema } from '../../ConfigSchema';
import { forEach } from '@azera/util';
import { ConnectionManager } from 'typeorm';

export class TypeORMBundle extends Bundle {

    static bundleName = "TypeORM";
    
    init( @Inject() config: ConfigSchema, @Inject() container: Container ) {
        config
        .node('db', { description: 'Database', type: 'object' })
        .node('db.*', { description: 'Database connection', type: 'object' })
        .node('db.*.type', { description: 'Database driver', type: 'enum:mongodb,mssql', required: true })
        .node('db.*.host', { description: 'Database host', type: 'string', default: 'localhost' })
        .node('db.*.port', { description: 'Database port', type: 'string|number' })
        .node('db.*.username', { description: 'Database username', type: 'string' })
        .node('db.*.password', { description: 'Database password', type: 'string' })
        .node('db.*.database', { description: 'Database name', type: 'string' })
        .node('db.*.useNewUrlParser', { description: 'MongoDb useNewUrlParser', type: 'boolean', default: false })
        .node('db.*.useUnifiedTopology', { description: 'MongoDb useUnifiedTopology', type: 'boolean', default: false })

        container.setFactory(ConnectionManager, function connectionManagerFactory() {
            return new ConnectionManager;
        });
    }

    getServices() {
        return [
            ConnectionManager
        ];
    }

    boot( @Inject('$config') config: any, @Inject() connectionManager: ConnectionManager ) {

        let db = config && config.db || {};

        forEach(db, (options, name) => {
            connectionManager.create(Object.assign({ name }, options) as any);
        });

    }

}