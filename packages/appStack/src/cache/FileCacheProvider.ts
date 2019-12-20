import { ICacheProvider } from './ICacheProvider';
import { promises as fs, exists } from 'fs';

/**
 * File-system cache provider
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class FileCacheProvider implements ICacheProvider {
    
    constructor(
        public name: string = 'file',
        public path: string) {}

    async has(key: string): Promise<boolean> {
        return new Promise(resolve => {
            exists(this.path + '/' + key, resolve);
        });
    }
    
    set(key: string, value: any): Promise<void> {
        return fs.writeFile(this.path + '/' + key, JSON.stringify({ value, updated: Date.now() }));
    }

    async get<T>(key: string, expire?: number | undefined): Promise<T | undefined> {
        if (await this.has(key)) {
            let hit = JSON.parse((await fs.readFile(this.path + '/' + key)).toString('utf8'));
            if (expire && (Date.now() - hit.updated) > expire) return undefined;
            return hit.value;
        }
        return undefined;
    }

    async memo<T>(key: string, value: () => Promise<T>, expire?: number | undefined): Promise<T> {
        let data = await this.get<T>(key, expire);
        if (undefined === data) {
            await this.set(key, data = await value());
        }
        return data;
    }
}