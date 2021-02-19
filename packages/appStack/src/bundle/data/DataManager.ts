import { is } from '@azera/util';
import { getClassDecoratedProps, getMeta, getMetaMap, hasMeta } from '../../Metadata';
import { invariant } from '../../Util';
import { DataConnection } from './DataConnection';
import { DataConnectionOptions } from './DataConnectionOptions';
import { DataField, DataModel } from './DataDecorators';
import { DataDriver } from './DataDriver';
import { DataModelSchema } from './DataModelSchema';
import { DataMemoryDriver } from './driver/DataMemoryDriver';
import * as StringUtil from '../../helper/Strings';

/**
 * Data manager
 */
export class DataManager {

    /** Connections */
    public connections: { [name: string]: DataConnection } = {};

    /** Drivers */
    public drivers: { [name: string]: DataDriver } = {};

    /** Model schemas */
    public schemas: { [name: string]: DataModelSchema } = {};

    constructor(
        drivers: DataDriver[] = [
            new DataMemoryDriver
        ]
    ) {
        invariant(Array.isArray(drivers), `Drivers must be an array of driver objects`);

        drivers.forEach(driver => this.addDriver(driver));
    }

    /**
     * Parse a connection string to connection options
     * @param connectionString Connection string
     */
    public parseConnectionUrl(connectionString: string): DataConnectionOptions {
        let re = /(?<driver>\w+)\:\/\/(?:(?<username>[\w_]+)\:(?<password>[\w_\-#]+)@)?(?<hostname>[a-zA-Z_\-0-9]+)(?:\:(?<port>\d+))?(?:\/(?<database>[a-zA-Z0-9_]+))?$/;

        invariant(re.test(connectionString), `Invalid connection string %s`, connectionString);
        
        let options = re.exec(connectionString)!.groups as any;
        if (options.port) options.port = Number(options.port);

        return { ...options };
    }

    public addDriver(driver: DataDriver): this {
        driver.manager = this;
        this.drivers[driver.driverName] = driver;
        return this;
    }

    /**
     * Create an connection
     * @param name Connection name
     * @param options Connection options
     */
    public newConnection(name: string, options: DataConnectionOptions): DataConnection
    public newConnection(name: string, connectionUrl: string): DataConnection
    public newConnection(name: string, connectionUrl: any): DataConnection
    {
        let options!: DataConnectionOptions;
        if (typeof connectionUrl == 'string') {
            options = this.parseConnectionUrl(connectionUrl);
        } else {
            options = connectionUrl;
        }

        let driver = this.drivers[options.driver];

        invariant(driver, `Driver %s not found`, options.driver);

        return this.connections[name] = driver.newConnection(options);
    }
    

    public addModel(connection: string | DataConnection, model: any)
    {
        invariant(is.Class(model), `Model must be a class`);
        invariant(hasMeta(DataModel, model), `Model object must be decorated DataModel decorator`);

        connection = typeof connection == 'string' ? this.connections[connection] : connection

        invariant(connection, `Connection %s not found`, connection);
        invariant(this.schemas[model.name] == undefined, `Data model %s was defined before`, model.name);

        let dataModel = getMeta(DataModel, model);
        let props = getClassDecoratedProps(model).keys();
        let schema: DataModelSchema = {
            connection,
            collectionName: dataModel?.collectionName ?? StringUtil.snakeCase(model.name),
            modelName: model.name,
            fields: {}
        };

        for (let prop of props) {
            let field = getMeta(DataField, model, prop);
            if (field) {
                schema.fields[prop] = field as any;
            }
        }

        this.schemas[schema.modelName] = schema;
        return this;
    }

    public getModel(model: any) {
        return this.schemas[is.Class(model) ? model.name : model];
    }

}
