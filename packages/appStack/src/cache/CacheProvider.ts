import { URL } from "url";

export interface CacheProviderOptions {
    // Expire duration in Miliseconds
    expire?: number

    // If true when cache expired update will be done in background and old value returns until new value
    silent?: boolean
}

export interface CacheProviderHit<T> {
    value: T
    updated: number
}

/**
 * Abstract Cache Provider
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export abstract class CacheProvider {

    static readonly schema: string;

    public name!: string;
    public url?: URL;

    abstract set<T>(key: string, value: T): Promise<T>
    abstract get<T>(key: string, expire?: number): Promise<T | undefined>
    abstract memo<T>(key: string, value: () => Promise<T>, options?: CacheProviderOptions): Promise<T>
    abstract memo<T>(key: string, value: () => Promise<T>, expire?: number): Promise<T>
    abstract hit<T>(key: string): Promise<CacheProviderHit<T> | undefined>
    abstract delete(key: string): Promise<number>
    abstract has(key: string): Promise<boolean>

}