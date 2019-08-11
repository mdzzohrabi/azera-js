export interface Model {
    name: string
    description?: string
    fields: ModelField[]
    dataSourceName: string
}

export interface ModelField {
    name: string
    type: FieldType
    size?: number
    default?: any
    required?: boolean
    description?: string
}

export type FieldType = 'number' | 'string' | 'boolean';