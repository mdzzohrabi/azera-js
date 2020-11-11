import { Container, Inject } from '@azera/container';
import { forEach } from '@azera/util';
import { Bundle } from '../../Bundle';
import { ConfigSchema } from '../../ConfigSchema';
import { Kernel } from '../../Kernel';
import { Profiler } from '../../Profiler';
import { wrapCreateConnectionWithProxy } from '../../net';

export class TypeORMBundle extends Bundle {

    static bundleName = "TypeORM";
    
    @Inject() async init(config: ConfigSchema, container: Container) {
        config
        .node('typeOrm', { description: 'TypeORM Connection Manager confugration' })
        .node('typeOrm.defaultConnection', { description: 'Default connection name (default: main)', default: 'main' })
        .node('typeOrm.connections', { description: 'Database connections', type: 'object' })
        .node('typeOrm.connections.*', { description: 'Database connection', type: 'object' })
        .node('typeOrm.connections.*.type', { description: 'Database driver', type: 'enum:mongodb,mssql,mysql,postgres,cockroachdb,mariadb,sqlite,cordova,nativescript,oracle,sqljs,react-native' })
        .node('typeOrm.connections.*.charset', { description: 'The charset for the connection. This is called "collation" in the SQL-level of MySQL (like utf8_general_ci). If a SQL-level charset is specified (like utf8mb4) then the default collation for that charset is used. (Default: UTF8_GENERAL_CI).', type: 'string' })
        .node('typeOrm.connections.*.host', { description: 'Database host', type: 'string' })
        .node('typeOrm.connections.*.port', { description: 'Database port', type: 'string|number' })
        .node('typeOrm.connections.*.username', { description: 'Database username', type: 'string' })
        .node('typeOrm.connections.*.password', { description: 'Database password', type: 'string' })
        .node('typeOrm.connections.*.database', { description: 'Database name', type: 'string' })
        .node('typeOrm.connections.*.synchronize', { description: 'Synchronize', type: 'boolean' })
        .node('typeOrm.connections.*.extra', { description: 'Extra connection options to be passed to the underlying driver. Use it if you want to pass extra settings to underlying database driver', type: 'object', skipChildren: true })
        .node('typeOrm.connections.*.entities', { description: 'Entities to be loaded and used for this connection', type: 'array' })
        .node('typeOrm.connections.*.entities.*', { description: 'Connection entity', type: 'string', validate(entity) { return container.invoke(Kernel).use(entity) } })
        .node('typeOrm.connections.*.subscribers', { description: 'Subscribers to be loaded and used for this connection.', type: 'array' })
        .node('typeOrm.connections.*.subscribers.*', { description: 'Subscriber', type: 'string', validate(entity) { return container.invoke(Kernel).use(entity) } })
        .node('typeOrm.connections.*.maxQueryExecutionTime ', { description: 'If query execution time exceed this given max execution time (in milliseconds) then logger will log this query.', type: 'number' })
        .node('typeOrm.connections.*.useNewUrlParser', { description: 'MongoDb useNewUrlParser', type: 'boolean', default: false })
        .node('typeOrm.connections.*.useUnifiedTopology', { description: 'MongoDb useUnifiedTopology', type: 'boolean', default: false })
        .node('typeOrm.proxy', { description: 'Proxy', type: 'string' })
    }

    /**
     * Generate `ConnectionManager` 
     * @param $config Application configuration
     */
    async connectionManagerFactory($config: any, serviceContainer: Container) {
        let profiler = serviceContainer.invoke(Profiler);
        let proxy = $config?.typeOrm?.proxy;
        let { ConnectionManager, Connection, SelectQueryBuilder, InsertQueryBuilder, UpdateQueryBuilder } = await import('typeorm');

        if (proxy) {
            let mongo = await import('mongodb');
            mongo.MongoClient.prototype.connect = wrapCreateConnectionWithProxy(proxy, mongo.MongoClient.prototype.connect);
        }
        
        let manager = new ConnectionManager;
        let connections = $config?.typeOrm?.connections ?? {};
        forEach(connections, (options, name) => {
            manager.create(Object.assign({ name }, options) as any);
        });

        if (profiler.enabled) {
            profiler.profileMethod(Connection.prototype, 'connect', 'orm.connect');
            profiler.profileMethod(Connection.prototype, 'transaction', 'orm.transaction');
            profiler.profileMethod(SelectQueryBuilder.prototype, 'getRawAndEntities', 'orm.query', qb => {
                let [sql] = qb.getQueryAndParameters();
                return ({ sql });
            });
            profiler.profileMethod(InsertQueryBuilder.prototype, 'execute', 'orm.query');
            profiler.profileMethod(UpdateQueryBuilder.prototype, 'execute', 'orm.query');
        }

        return manager;
    }

    async boot(@Inject('$config') config: any, @Inject() container: Container) {
        let defaultConnection = config?.typeOrm?.defaultConnection ?? 'main';
        let connections = config?.typeOrm?.connections ?? {};
        let hasDefaultConnection = false;
        let connectionCount = Object.keys(connections).length;

        // Default connection
        if (connectionCount > 0 ) {
            let { Connection, ConnectionManager, EntityManager, MongoEntityManager } = await import('typeorm');

            // Connection manager factory
            container.setFactory(ConnectionManager, this.connectionManagerFactory);

            // Register connections as services
            forEach(connections, (options, name) => {
                if (name == defaultConnection) hasDefaultConnection = true;
                container.setFactory('connection.' + name, async function connectionFactory() {
                    let connection = (await container.invokeAsync(ConnectionManager)).get(name);
                    if (!connection.isConnected) await connection.connect();
                    return connection;
                });
            });

            if (!hasDefaultConnection) throw Error(`Default connection "${defaultConnection}" doesnt exists`);

            container.setFactory(Connection, async function defaultConnectionFactory() {
                let connection = (await container.invokeAsync(ConnectionManager)).get(defaultConnection);
                if (!connection.isConnected) await connection.connect();
                return connection;
            });

            container.setFactory(EntityManager, async function defaultEntityManagerFactory() {
                return (await container.invokeAsync(Connection)).manager;
            });

            container.setFactory(MongoEntityManager, async function defaultMongoEntityManagerFactory() {
                return (await container.invokeAsync(Connection)).mongoManager;
            });
        }

    }

}