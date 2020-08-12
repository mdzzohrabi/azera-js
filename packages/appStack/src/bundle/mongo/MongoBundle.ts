import { Bundle } from '../../Bundle';
import { Inject, Container } from '@azera/container';
import { ConfigSchema } from '../../ConfigSchema';
import { forEach } from '@azera/util';

export class MongoBundle extends Bundle {

    get bundleName() { return "Mongo"; }

    @Inject() async init(config: ConfigSchema) {

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
        ;

    }

    @Inject() async run(container: Container) {

        let config = container.getParameter('config', {})?.mongo ?? {};
        let connections: { [name: string]: any } = config?.connections ?? {};

        if (Object.keys(connections).length == 0) return;

        let defaultConnectionName = config?.defaultConnection ?? 'main';

        let { MongoClient } = await import('mongodb');

        // Connections
        forEach(connections, (conn, name) => {
            container.setFactory(`mongo.${name}`, function mongoConnectionFactory() {
                let auth = "";
                if (conn.username) {
                    auth = `${conn.username}:${encodeURIComponent(conn.password)}@`;
                }
                return new MongoClient(`mongodb://${auth}${conn.host}:${conn.port ?? 27017}?authSource=${conn.database}&ssl=${conn.host.startsWith('https')}`, {
                    useNewUrlParser: conn.useNewUrlParser,
                    useUnifiedTopology: conn.useUnifiedTopology,
                    auth: conn.username ? { user: conn.username, password: conn.password } : undefined
                }).connect();
            });
        });

        // Default connection factory
        if (defaultConnectionName && connections[defaultConnectionName]) {
            container.setFactory(MongoClient, function mongoDefaultFactory() {
                return container.invokeAsync(`mongo.${defaultConnectionName}`);
            })
        }

    }

}