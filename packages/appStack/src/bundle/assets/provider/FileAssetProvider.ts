import { Inject } from '@azera/stack';
import { promises } from 'fs';
import { resolve as resolvePath, extname } from 'path';
import { invariant } from '../../../helper/Util';
import { File } from '../File';
import { Storage } from '../Storage';
import { AssetProvider } from './AssetProvider';

let {  readFile, unlink, writeFile, stat, readdir, lstat } = promises;

/**
 * File-system asset provider
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class FileAssetProvider extends AssetProvider {

    @Inject('$kernel.root') rootDir!: string;

    name: string = 'local';

    async assertPath(storage: Storage) {
        if (!storage.path) throw Error(`Asset path not defined for storage ${storage.name}`);
        let result = await stat(resolvePath(this.rootDir, storage.path));
        return result.isDirectory();
    }
    
    async save(storage: Storage, file: File): Promise<string> {
        await this.assertPath(storage);
        invariant(file.content instanceof Buffer, `FileAssetProvider only support Buffer content`);
        // Destination path
        let path = resolvePath( this.rootDir, storage.path! , file.name );
        // Save file
        await writeFile(path, file.content! as Buffer)
        return path;
    }

    async read(storage: Storage, file: File): Promise<Buffer> {
        await this.assertPath(storage);
        // Destination path
        let path = resolvePath( this.rootDir, storage.path! , file.name );
        return await readFile(path);
    }

    async delete(storage: Storage, file: File): Promise<boolean> {
        await this.assertPath(storage);
        // Destination path
        let path = resolvePath( this.rootDir, storage.path! , file.name );
        await unlink(path);
        return true;
    }

    async list(storage: Storage, path?: string) {
        await this.assertPath(storage);
        let result: Omit<File, 'content'>[] = [];
        for (let file of await readdir(resolvePath(storage.path!, path ?? ''))) {
            result.push({
                name: file,
                isDirectory: false,
                extension: extname(file),
                createDate: (await lstat(file)).ctime
            });
        }
        return result;
    }

}