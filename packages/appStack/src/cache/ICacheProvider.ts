export interface CacheProviderOptions {
    expire?: number
    silent?: boolean
}

export interface CacheProviderHit<T> {
    value: T
    updated: number
}


export interface ICacheProvider {

    name: string

    set<T>(key: string, value: T): Promise<T>

    get<T>(key: string, expire?: number): Promise<T | undefined>

    memo<T>(key: string, value: () => Promise<T>, options?: CacheProviderOptions): Promise<T>
    memo<T>(key: string, value: () => Promise<T>, expire?: number): Promise<T>

    hit<T>(key: string): Promise<CacheProviderHit<T> | undefined>

}