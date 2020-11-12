import { DataConnectionOptions } from './DataConnectionOptions';
import { DataDriver } from './DataDriver';

export class DataConnection {

    constructor(
        public driver: DataDriver,
        public connectionOptions: DataConnectionOptions,
        public models: any = []
    ) {}

    public async connect(): Promise<boolean> {
        return false;
    }

}