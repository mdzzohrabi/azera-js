import { format as formatUrl } from 'url';
import { invariant } from '../../Util';
import { CacheProvider, CacheProviderHit, CacheProviderOptions } from '../CacheProvider';

/**
 * Redis cache provider
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class RedisCacheProvider extends CacheProvider {

    static readonly alias = 'redis';

    getClient() {
        invariant(this.url, `Redis cache url not specified`);
        return import('redis').then(redis => redis.createClient(formatUrl(this.url!)));
    }

    async has(key: string): Promise<boolean> {
        const client = await this.getClient();
        return new Promise<boolean>((resolve, reject) => {
            client.exists(key, (err, n) => {
                if (err)
                    reject(err);
                else
                    resolve(n > 0);
            });
        });
    }
    
    async set<T>(key: string, value: T): Promise<T> {
        const client = await this.getClient();
        return new Promise<T>((resolve, reject) => {
            client.set(key, JSON.stringify(value), (err, result_1) => {
                if (err || result_1 !== 'OK')
                    reject(err);
                else
                    resolve(value);
            });
        });
    }

    async get<T>(key: string, expire?: number | undefined): Promise<T | undefined> {
        const client = await this.getClient();
        return new Promise<T>((resolve, reject) => {
            client.get(key, (err, result) => {
                if (err || result !== 'OK') reject(err);
                else resolve(JSON.parse(result));
            });
        });
    }

    async expire(key: string, secs: number) {
        const client = await this.getClient();
        return new Promise<number>((resolve, reject) => {
            client.expire(key, secs, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }

    async ttl(key: string, secs: number) {
        const client = await this.getClient();
        return new Promise<number>((resolve, reject) => {
            client.ttl(key, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
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
        return new Promise<number>((resolve, reject) => {
            client.del(key, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }

}