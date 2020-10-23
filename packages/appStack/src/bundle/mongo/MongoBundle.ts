import { Bundle } from '../../Bundle';
import { Inject, Container } from '@azera/container';
import { ConfigSchema } from '../../ConfigSchema';
import { forEach } from '@azera/util';
import { wrapCreateConnectionWithProxy } from '../../net/Network';
import { Kernel } from '../../Kernel';
import { MongoClient, Db } from 'mongodb';
import { Logger } from '../../Logger';

export class MongoBundle extends Bundle {

    get bundleName() { return "Mongo"; }

    @Inject() async init(config: ConfigSchema, container: Container) {

        config
            .node('mongo', { description: 'MongoDB Native Driver' })
            .node('mongo.defaultConnection', { description: 'Default connection name', type: 'string', default: 'main' })
            .node('mongo.connections', { description: 'Connections', type: 'object' })
            .node('mongo.connections.*', { description: 'Connection', type: 'object' })
            .node('mongo.connections.*.host', { description: 'Hostname' })
            .node('mongo.connections.*.port', { description: 'Port (default: 27017)', default: 27017, type: 'string|number' })
            .node('mongo.connections.*.username', { description: 'Username' })
            .node('mongo.connections.*.password', { description: 'Password' })
            .node('mongo.connections.*.database', { description: 'Database' })
            .node('mongo.connections.*.useNewUrlParser', { description: 'MongoDb useNewUrlParser', type: 'boolean', default: false })
            .node('mongo.connections.*.useUnifiedTopology', { description: 'MongoDb useUnifiedTopology', type: 'boolean', default: false })
            .node('mongo.connections.*.repositories', { description: 'MongoDb Repositories', type: 'object|array' })
            .node('mongo.connections.*.repositories.*', { description: 'Repositoriy', type: 'string', validate(repo) { return container.invoke(Kernel).use(repo) } })
            .node('mongo.proxy', { description: 'Proxy', type: 'string' })
        ;

    }

    @Inject() async run(container: Container) {

        let config = container.getParameter('config', {})?.mongo ?? {};
        let connections: { [name: string]: any } = config?.connections ?? {};
        let defaultConnectionName = config?.defaultConnection ?? 'main';
        let defaultDatabase: string | undefined = undefined;
        let proxy = config?.proxy;
        let names = Object.keys(connections);

        if (names.length == 0) return;

        if (names.length == 1) {
            defaultConnectionName = names[0];
            defaultDatabase = connections[names[0]].database;
        }

        // Connections
        forEach(connections, (conn, name) => {
            let serviceName = `mongo.${name}`;
            container.setFactory(serviceName, function mongoConnectionFactory() {
                // Proxy
                if (proxy)
                    MongoClient.prototype.connect = wrapCreateConnectionWithProxy(proxy, MongoClient.prototype.connect);

                let auth = "";
                if (conn.username) {
                    auth = `${conn.username}:${encodeURIComponent(conn.password)}@`;
                }
                let client = new MongoClient(`mongodb://${auth}${conn.host}:${conn.port ?? 27017}?authSource=${conn.database}&ssl=${conn.host.startsWith('https')}`, {
                    useNewUrlParser: conn.useNewUrlParser,
                    useUnifiedTopology: conn.useUnifiedTopology,
                    auth: conn.username ? { user: conn.username, password: conn.password } : undefined
                });

                console.log("Create mongo connection instance");

                client.on('error', async (err) => {
                    let logger = await container.invokeAsync(Logger);
                    console.log("Database error", err);
                    logger.error(`Mongo database '${name}'`);
                    container['instances'].delete(serviceName);
                    if (name == defaultConnectionName) {
                        container['instances'].delete(MongoClient);
                    }
                });
                
                return client.connect();
            });

            let repositories: { [repo: string]: any } = conn.repositories ?? {};

            if (Object.keys(repositories).length > 0 && !conn.database) throw Error(`You must defined database name for connection "${name}" to initialize repositories`);

            // Repositories
            forEach(repositories, (repo, collectionName) => {

                if (!repo) throw Error(`Mongo repository ${collectionName} not found`);

                if (typeof collectionName != 'string') {
                    collectionName = repo['collectionName'];
                }
                container.setFactory(repo, function MongoCollectionFactory() {
                    return container.invokeAsync<MongoClient>(serviceName).then(client => client.db(conn.database).collection(collectionName)).then(collection => {
                        let repoInstance = new repo;
                        repoInstance.__proto__.__proto__ = collection;
                        return repoInstance;
                    });
                });
            });
        });

        

        // Default connection factory
        if (defaultConnectionName && connections[defaultConnectionName]) {
            container.setFactory(MongoClient, function mongoDefaultFactory() {
                return container.invokeAsync(`mongo.${defaultConnectionName}`);
            })

            if (defaultDatabase) {
                container.setFactory(Db, function mongoDefaultDatabaseFactory() {
                    return container.invokeAsync<MongoClient>(`mongo.${defaultConnectionName}`).then(client => client.db(defaultDatabase));
                });
            }
        }

    }

}