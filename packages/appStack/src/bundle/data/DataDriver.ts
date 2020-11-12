import { DataConnection } from './DataConnection';
import { DataConnectionOptions } from './DataConnectionOptions';
import { DataManager } from './DataManager';
import { DataType } from './DataType';

/**
 * Data driver
 */
export abstract class DataDriver {

    public manager!: DataManager;

    /** Data driver name. e.g: mysql */
    abstract driverName: string;

    /** Data types */
    abstract dataTypes: DataType[] = [];

    /** Create new connection */
    public abstract newConnection(connectionOptions: DataConnectionOptions): DataConnection
}