/**
 * Data type
 */
export interface DataType {

    /** Type name */
    typeName: string;

    /** Transform data to database compatible form */
    encode?(value: any): any

    /** Transform data from database to real type */
    decode?(value: any): any

}