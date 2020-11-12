import { DataConnection } from '../DataConnection';


export class DataMemoryConnection extends DataConnection {

    async connect() {
        return true;
    }

}