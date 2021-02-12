import { DataConnection } from './DataConnection';
import { DataType } from './DataType';

/**
 * Data model schema
 */
export interface DataModelSchema {

    /** Model name */
    modelName: string

    /** Data collection name */
    collectionName: string

    /** Fields */
    fields: { [name: string]: DataModelFieldSchema }

    /** Connection */
    connection: DataConnection
    
}

export interface DataModelFieldSchema {
    required?: boolean
    type: string
    size?: number
    default?: any
    validator?: RegExp | ((value: any) => boolean) | ((value: any) => boolean)[]
}