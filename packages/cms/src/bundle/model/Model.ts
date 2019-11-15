import { invariant } from '@azera/stack';

/**
 * Data model
 */
export class Model {
    constructor(
        public name: string,
        public description?: string,
        public fields: ModelField[] = [],
        public dataSource?: string,
        public collection?: string,
        public lock?: boolean
    ) {
        this.collection = collection = collection || name;
        invariant(name, `Model must have a name`);
        invariant(dataSource, `Data-source not defined for model ${ name }`);
    }
}

/**
 * Dat model field
 */
export class ModelField {
    constructor(
        public name: string,
        public type: FieldType,
        public caption?: string,
        public size?: number,
        public defaults?: any,
        public required?: boolean,
        public description?: string,
        public primary?: boolean
    ) {}
}

export type FieldType = 'number' | 'string' | 'boolean';
