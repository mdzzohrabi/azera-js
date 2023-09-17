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

    /** Cache provider schema */
    static readonly schema: string;

    public constructor(
        /** Cache provider name */
        public name: string = '',

        /** Cache provider Url */
        public url?: URL
    ) {}

    abstract set<T>(key: string, value: T): Promise<T>

    /**
     * Get a cached value
     * @param key Cache key
     * @param expire Expire duration in ms
     */
    abstract get<T>(key: string, expire?: number): Promise<T | undefined>

    /**
     * Get a value from cache or cache it for next use
     * @param key Cache key
     * @param value Asynchronous value generator
     * @param options Cache options
     */
    abstract memo<T>(key: string, value: () => Promise<T>, options?: CacheProviderOptions): Promise<T>
    abstract memo<T>(key: string, value: () => Promise<T>, expire?: number): Promise<T>

    /**
     * Get a cached hit object
     * @param key Cache key
     */
    abstract hit<T>(key: string): Promise<CacheProviderHit<T> | undefined>

    /**
     * Delete a cached value
     * @param key Cache key
     */
    abstract delete(key: string): Promise<number>

    /**
     * Check for existence of cached value
     * @param key Cache key
     * @param expire Expire duration in ms
     */
    abstract has(key: string, expire?: number): Promise<boolean>

}