import { ICacheProvider } from './ICacheProvider';

/**
 * Memory cache provider
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class MemoryCacheProvider implements ICacheProvider {
    name: string = 'memory';

    cache: { [key: string]: { value: any, updated: number } } = {};
    
    async set(key: string, value: any) {
        this.cache[key] = { value, updated: Date.now() };
    }

    async get<T>(key: string, expire?: number | undefined): Promise<T | undefined> {
        let hit = this.cache[key];
        if (!hit) return undefined;
        if (expire && (Date.now() - hit.updated) > expire) return undefined;
        return hit.value;
    }

    async memo<T>(key: string, value: () => Promise<T>, expire?: number | undefined): Promise<T> {
        let data = await this.get<T>(key, expire);
        if (undefined === data) {
            await this.set(key, data = await value());
        }
        return data;
    }


}