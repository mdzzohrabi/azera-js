export interface ICacheProvider {

    name: string

    set(key: string, value: any): Promise<void>

    get<T>(key: string, expire?: number): Promise<T | undefined>

    memo<T>(key: string, value: () => Promise<T>, expire?: number): Promise<T>

}