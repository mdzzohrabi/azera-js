import { Inject } from '@azera/stack';
import { readFile, unlink, writeFile } from 'fs';
import { resolve as resolvePath } from 'path';
import { File } from '../File';
import { Storage } from '../Storage';
import { AssetProvider } from './AssetProvider';

export class LocalAssetProvider extends AssetProvider {

    @Inject('$kernel.root') rootDir!: string;

    name: string = 'local';

    // assertPath(storage: Storage) {
    //     return new Promise((resolve, reject) => {
    //         exists( resolvePath(this.rootDir, storage.path) )
    //     })
    // }
    
    save(storage: Storage, file: import("../File").File): Promise<string> {
        return new Promise((resolve, reject) => {

            if (!storage.path) throw Error(`Asset path not defined for storage ${storage.name}`);

            // Destination path
            let path = resolvePath( this.rootDir, storage.path , file.name );

            // Save file
            writeFile(path, file.content!, (err) => {
                if (!err) resolve(path);
                else reject(err);
            });
        });
    }

    read(storage: Storage, file: File): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            if (!storage.path) throw Error(`Asset path not defined for storage ${storage.name}`);

            // Destination path
            let path = resolvePath( this.rootDir, storage.path , file.name );

            readFile(path, (err, data) => {
                if (!err) resolve(data);
                else reject(err);
            })
        });
    }

    delete(storage: Storage, file: File): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!storage.path) throw Error(`Asset path not defined for storage ${storage.name}`);

            // Destination path
            let path = resolvePath( this.rootDir, storage.path , file.name );

            unlink(path, (err) => {
                if (!err) resolve(true);
                else reject(err);
            });
        });
    }


}