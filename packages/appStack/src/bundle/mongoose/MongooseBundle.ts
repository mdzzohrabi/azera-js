import { Container, Inject } from '@azera/container';
import { forEach } from '@azera/util';
import * as mongoose from 'mongoose';
import { Bundle } from '../../Bundle';
import { ConfigSchema } from '../../ConfigSchema';
import { Kernel } from '../../Kernel';
import { wrapCreateConnectionWithProxy } from '../../net/Network';

export { mongoose };

/**
 * Mongoose bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class MongooseBundle extends Bundle {

    get bundleName() { return "Mongoose"; }

    init(@Inject() config: ConfigSchema, @Inject() container: Container) {

        config
        .node('mongoose', {description: 'Mongoose configuration'})
        .node('mongoose.defaultConnection', { description: 'Default connection name (default: main)', default: 'main' })
        .node('mongoose.connections', {description: 'Mongoose connections', type: 'object'})
        .node('mongoose.connections.*', {description: 'Mongoose connection', type: 'object|string'})
        .node('mongoose.connections.*.uri', { description: 'Database connection uri', type: 'string' })
        .node('mongoose.connections.*.host', { description: 'Database host', type: 'string' })
        .node('mongoose.connections.*.port', { description: 'Database port', type: 'string|number' })
        .node('mongoose.connections.*.user', { description: 'Database username', type: 'string' })
        .node('mongoose.connections.*.pass', { description: 'Database password', type: 'string' })
        .node('mongoose.connections.*.dbName', { description: 'Database name', type: 'string' })
        .node('mongoose.connections.*.poolSize', { description: 'The maximum number of sockets the MongoDB driver will keep open for this connection', type: 'string|number' })
        .node('mongoose.connections.*.family', { description: 'Whether to connect using IPv4 or IPv6', type: 'string|number' })
        .node('mongoose.connections.*.extra', { description: 'Extra connection options to be passed to the underlying driver. Use it if you want to pass extra settings to underlying database driver', type: 'object', skipChildren: true })
        .node('mongoose.connections.*.useNewUrlParser', { description: 'MongoDb useNewUrlParser', type: 'boolean', default: false })
        .node('mongoose.connections.*.useUnifiedTopology', { description: 'MongoDb useUnifiedTopology', type: 'boolean', default: false })
        .node('mongoose.connections.*.models', { description: 'Models to be loaded and used for this connection', type: 'array' })
        .node('mongoose.connections.*.models.*', { description: 'Connection entity', type: 'string', validate(entity) { return container.invoke(Kernel).use(entity) } })
        .node('mongoose.proxy', { description: 'Proxy', type: 'string' })
    }

    boot(@Inject('$config') config: any, @Inject() container: Container) {
        
        // Skip configuration if not config exists
        if (!config?.mongoose?.connections) return;
        
        let { defaultConnection, connections, proxy } = { defaultConnection: 'main', connections: {}, proxy: null,  ...config.mongoose } as any;

        // Prepare connections
        forEach(connections, (options: string|any, name: string) => {
            let serviceName = `mongoose.${name}`;
            // Generate connection factory
            container.setFactory(serviceName, function mongooseConnectionFactory() {
                if (proxy) {
                    mongoose.mongo.MongoClient.prototype.connect = wrapCreateConnectionWithProxy(proxy, mongoose.mongo.MongoClient.prototype.connect);
                }      

                if (typeof options == 'string')
                    return mongoose.createConnection(options);
                
                let dbOptions = { ...options, ...(options.extra ?? {}) };
                dbOptions.models && delete dbOptions.models;
                let uri = options.uri || `mongodb://${options.user ?? ''}${options.pass ? ':' + options.pass : ''}${options.user ? '@' : ''}${options.host ?? 'localhost'}:${options.port ?? 27017}/${options.dbName}`;

                if (defaultConnection == name) mongoose.connect(uri, dbOptions);

                return mongoose.createConnection(uri, dbOptions);
            });

            // Prepare models
            if (Array.isArray(options.models)) {
                forEach(options.models as mongoose.Model<mongoose.Document>[], model => {
                    container.invoke<mongoose.Connection>(serviceName).model(model.modelName, model.schema);
                });
            }
        });

        if (defaultConnection) {
            container.setFactory(mongoose.Connection, () => container.invoke(`mongoose.${defaultConnection}`));
        }

    }
}