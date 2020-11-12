import { DataConnection } from '../DataConnection';
import { DataConnectionOptions } from '../DataConnectionOptions';
import { DataDriver } from '../DataDriver';
import { DataType } from '../DataType';
import { DataMemoryConnection } from './DataMemoryConnection';

export class DataMemoryDriver extends DataDriver {
    
    driverName: string = 'memory';
    
    dataTypes: DataType[] = [
        {
            typeName: 'string'
        }
    ];

    public newConnection(options: DataConnectionOptions): DataMemoryConnection {
        return new DataMemoryConnection(this, options);
    }

}