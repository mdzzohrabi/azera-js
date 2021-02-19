import { promises as fs } from 'fs';
import * as path from 'path';
import { CacheProviderHit, CacheProviderOptions, CacheProvider } from '../CacheProvider';

/**
 * File-system cache provider
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class FileCacheProvider extends CacheProvider {

    static readonly schema = 'file';

    get path() {
        return this.url?.pathname!;
    }

    private isFileExists(path: string) {
        return fs.stat(path).then(s => s.isFile()).catch(e => false);
    }

    private isFolderExists(path: string) {
        return fs.stat(path).then(s => s.isDirectory()).catch(e => false);
    }

    async has(key: string): Promise<boolean> {
        return this.isFileExists(this.path + '/' + key);
    }
    
    async set<T>(key: string, value: T): Promise<T> {

        if (!await this.isFolderExists(this.path)) {
            await fs.mkdir(this.path, { recursive: true });
        }
        
        await fs.writeFile(this.path + '/' + key, JSON.stringify({ value, updated: Date.now() }));
        return value;
    }

    async get<T>(key: string, expire?: number | undefined): Promise<T | undefined> {
        let hit = await this.hit<T>(key);
        if (hit) {
            if (expire && (Date.now() - hit.updated) > expire) return undefined;
            return hit.value;
        }
        return undefined;
    }

    async memo<T>(key: string, value: () => Promise<T>, options?: CacheProviderOptions): Promise<T>
    async memo<T>(key: string, value: () => Promise<T>, expire?: number): Promise<T>
    async memo<T>(key: string, value: () => Promise<T>, options?: any): Promise<T>
    {
        if (typeof options == 'number') options = { expire: options };
        let { expire, silent = false } = options ?? {};
        let data = await this.get<T>(key, expire);
        if (undefined === data) {
            await this.set(key, data = await value());
        }
        return data;
    }

    async hit<T>(key: string): Promise<CacheProviderHit<T> | undefined> {
        if (await this.has(key)) {
            let hit = JSON.parse((await fs.readFile(this.path + '/' + key)).toString('utf8'));
            return hit;
        }
        return undefined;
    }

    async delete(key: string): Promise<number> {
        let re = new RegExp('^' + key.replace('*','.*') + '$');
        let count = 0;

        let files = await fs.readdir(this.path);

        for (let file of files) {
            if (re.test(file)) {
                await fs.unlink( path.resolve(this.path, file) );
                count++;
            }
        }
        return count;
    }

}