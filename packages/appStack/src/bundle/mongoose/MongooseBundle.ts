import { Container, Inject } from '@azera/container';
import { forEach, is } from '@azera/util';
import { Connection, Document, Model } from 'mongoose';
import { Bundle } from '../Bundle';
import { ConfigSchema } from '../../config/ConfigSchema';
import { Kernel } from '../../kernel/Kernel';
import { wrapCreateConnectionWithProxy } from '../../net/Network';
import { Cli } from '../cli';

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
        .node('mongoose.connections.*.models', { description: 'Models to be loaded and used for this connection', type: 'array', skipChildren: true })
        .node('mongoose.connections.*.models.*', { description: 'Connection entity', type: 'string' })
        .node('mongoose.proxy', { description: 'Proxy', type: 'string' })
    }

    async boot(@Inject('$config') config: any, @Inject() cli: Cli, @Inject() container: Container, @Inject() kernel: Kernel) {
        
        // Skip configuration if not config exists
        if (!config?.mongoose?.connections) return;

        let { defaultConnection, connections, proxy } = { defaultConnection: 'main', connections: {}, proxy: null,  ...config.mongoose } as any;

        if (Object.keys(connections).length > 0) {
            await import('mongoose').then(mongoose => {
                
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

                        dbOptions.uri && delete dbOptions.uri;
                        
                        if (defaultConnection == name) mongoose.connect(uri, dbOptions);

                        return mongoose.createConnection(uri, dbOptions);
                    });

                    // Prepare models
                    if (Array.isArray(options.models)) {
                        forEach(options.models as Model<Document>[], model => {

                            if (is.String(model)) model = kernel.use(model) as any;
                            container.invoke<Connection>(serviceName).model(model.modelName, model.schema);
                            container.setFactory(model, () => model);
                            
                        });
                    }
                });

                if (defaultConnection) {
                    container.setFactory(mongoose.Connection, () => container.invoke(`mongoose.${defaultConnection}`));
                }

            })
            .catch(err => {
                if (/Cannot find module 'mongoose'/.test(err.message ?? err)) {
                    cli.error(`Mongoose module not installed, install by 'yarn add mongoose @types/mongoose'`);
                } else {
                    cli.error(err);
                }
            })
        }
    }
}