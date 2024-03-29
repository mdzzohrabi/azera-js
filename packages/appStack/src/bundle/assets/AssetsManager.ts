import { Service, Inject } from '@azera/container';
import { AssetProvider } from './provider/AssetProvider';
import { File } from './File';
import { Storage } from './Storage';

// @ts-ignore
@Service({
    autoTags: [
        { class: AssetProvider, tags: [ 'asset.provider' ] }
    ]
})
export class AssetManager {

    constructor(
        /**
         * Asset providers
         */
        @Inject('$$asset.provider') public providers: AssetProvider[] = [],

        /**
         * Asset storages
         */
        @Inject('=invoke("$config").assets?.storages || []') public storages: Storage[] = []
    ) {}

    /**
     * Save a file and return its saved location
     * 
     * @param storageName Storage name to save
     * @param file File
     */
    save(storageName: string, file: File) {
        let storage = this.getStorage(storageName);
        return this.getProvider(storage).save(storage, file);
    }

    /**
     * Read a file and return buffer
     * 
     * @param storageName Storage name
     * @param file File
     */
    read(storageName: string, fileName: string) {
        let storage = this.getStorage(storageName);
        return this.getProvider(storage).read(storage, { name: fileName });
    }

    /**
     * Delete a file
     * 
     * @param storageName Storage name
     * @param file File
     */
    delete(storageName: string, fileName: string) {
        let storage = this.getStorage(storageName);
        return this.getProvider(storage).delete(storage, { name: fileName });
    }

    /**
     * List of files
     * 
     * @param storageName Storage name
     * @param path Sub-directory
     * @returns 
     */
    list(storageName: string, path?: string) {
        let storage = this.getStorage(storageName);
        return this.getProvider(storage).list(storage, path);
    }

    /**
     * Get an storage
     * 
     * @param name Storage name
     */
    getStorage(name: string) {
        for (let storage of this.storages) {
            if (storage.name == name) return storage;
        }
        throw new Error(`Asset storage ${name} not found`);
    }

    /**
     * Get a asset provider
     * 
     * @param name Provider name
     */
    getProvider(storage: Storage): AssetProvider
    getProvider(providerName: string): AssetProvider
    getProvider(name: string | Storage): AssetProvider
    {
        if (typeof name == 'object' && 'provider' in name) {
            name = name.provider;
        }

        for (let provider of this.providers) {
            if (provider.name == name) return provider;
        }

        throw new Error(`Asset provider ${name} not found`);
    }

    getStorageProvider(storageName: string): AssetProvider {
        return this.getProvider(this.getStorage(storageName));
    }

}