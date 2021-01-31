import { CacheProvider, CacheProviderOptions, CacheProviderHit } from '../CacheProvider';

/**
 * Memory cache provider
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class MemoryCacheProvider extends CacheProvider {

    static readonly alias = 'memory';

    cache: { [key: string]: CacheProviderHit<any> } = {};
    
    async set<T>(key: string, value: T) {
        this.cache[key] = { value, updated: Date.now() };
        return value;
    }

    async get<T>(key: string, expire?: number | undefined): Promise<T | undefined> {
        let hit = this.cache[key];
        if (!hit) return undefined;
        if (expire && (Date.now() - hit.updated) > expire) return undefined;
        return hit.value;
    }

    async memo<T>(key: string, value: () => Promise<T>, options?: CacheProviderOptions): Promise<T>
    async memo<T>(key: string, value: () => Promise<T>, expire?: number): Promise<T>
    async memo<T>(key: string, value: () => Promise<T>, options?: any): Promise<T>
    {
        if (typeof options == 'number') options = { expire: options };
        let {expire, silent = false} = options || {};
        
        if (silent) {
            let hit = await this.hit<T>(key);
            if (hit) {
                if (Date.now() - hit.updated > expire) {
                    value().then(result => this.set(key, result));
                }
                return hit.value;
            } else {
                return await this.set(key, await value());
            }
        } else {
            let data = await this.get<T>(key, expire);
            if (undefined === data) {
                await this.set(key, data = await value());
            }
            return data;
        }
    }

    async hit<T>(key: string): Promise<CacheProviderHit<T> | undefined> {
        return this.cache[key];
    }

    async delete(key: string): Promise<number> {
        let re = new RegExp('^' + key.replace('*','.*') + '$');
        let count = 0;
        for (let key in this.cache) {
            if (re.test(key)) {
                count++;
                delete this.cache[key];
            }
        }
        return count;
    }

}