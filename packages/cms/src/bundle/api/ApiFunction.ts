
export interface ApiFunction {
    name: string
    invoke(...params: any[]): any
}