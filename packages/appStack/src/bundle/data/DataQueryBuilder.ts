import { DataManager } from "./DataManager";
import { DataModel, DataQueryWhere } from "./DataTypes";

/**
 * Data Query Builder
 */
export class DataQueryBuilder {

    constructor(public manager: DataManager) {}

    findAll(model: DataModel, where?: DataQueryWhere) {
        
    }

}
