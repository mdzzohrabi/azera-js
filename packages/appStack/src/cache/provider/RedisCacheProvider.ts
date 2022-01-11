import { format as formatUrl } from 'url';
import { invariant } from '../../helper/Util';
import { CacheProvider, CacheProviderHit, CacheProviderOptions } from '../CacheProvider';

/**
 * Redis cache provider
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class RedisCacheProvider extends CacheProvider {

    static readonly schema = 'redis';

    getClient() {
        invariant(this.url, `Redis cache url not specified`);
        return import('redis').then(redis => redis.createClient({
            url: this.url?.toString()
        }));
    }

    async has(key: string): Promise<boolean> {
        const client = await this.getClient();
        return client.exists(key);
    }
    
    async set<T>(key: string, value: T): Promise<T> {
        const client = await this.getClient();
        await client.set(key, JSON.stringify(value));
        return value;
    }

    async get<T>(key: string, expire?: number | undefined): Promise<T | undefined> {
        const client = await this.getClient();
        let value = await client.get(key);
        if (value)
            return JSON.parse(value);
    }

    async expire(key: string, secs: number) {
        const client = await this.getClient();
        return client.expire(key, secs);
    }

    async ttl(key: string, secs: number) {
        return (await this.getClient()).ttl(key);
    }

    async memo<T>(key: string, value: () => Promise<T>, options?: CacheProviderOptions): Promise<T>
    async memo<T>(key: string, value: () => Promise<T>, expire?: number): Promise<T>
    async memo<T>(key: string, value: () => Promise<T>, options?: any): Promise<T>
    {
        if (typeof options == 'number') options = { expire: options };
        let { expire, silent = false } = options;
        let data = await this.get<T>(key, expire);
        if (undefined === data) {
            await this.set(key, data = await value());
        }
        return data;
    }

    async hit<T>(key: string): Promise<CacheProviderHit<T> | undefined> {
        return undefined;
    }

    async delete(key: string): Promise<number> {
        const client = await this.getClient();
        return client.del(key);
    }

}