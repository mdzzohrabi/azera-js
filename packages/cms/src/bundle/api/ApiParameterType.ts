export abstract class ApiParameterType<T> {
    abstract name: string

    abstract isTypeOf(value: any): boolean

    abstract convert(value: any): T
}