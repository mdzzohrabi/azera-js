import { Service, Inject } from '@azera/stack';
import { AssetProvider } from './provider/AssetProvider';
import { File } from './File';
import { Storage } from './Storage';

@Service({
    autoTags: [
        { class: AssetProvider, tags: [ 'asset.provider' ] }
    ]
})
export class AssetManager {

    /**
     * Asset providers
     */
    @Inject('$$asset.provider') public providers: AssetProvider[] = [];

    /**
     * Asset storages
     */
    @Inject('=( invoke("$config").assets || {} ).storages || []') public storages: Storage[] = [];

    /**
     * Save a file and return its saved location
     * 
     * @param storageName Storage name to save
     * @param file File
     */
    save(storageName: string, file: File) {
        let storage = this.getStorage(storageName);
        let provider = this.getProvider(storage.provider);

        return provider.save(storage, file);
    }

    /**
     * Read a file and return buffer
     * 
     * @param storageName Storage name
     * @param file File
     */
    read(storageName: string, fileName: string) {
        let storage = this.getStorage(storageName);
        let provider = this.getProvider(storage.provider);

        return provider.read(storage, { name: fileName });
    }

    /**
     * Delete a file
     * 
     * @param storageName Storage name
     * @param file File
     */
    delete(storageName: string, fileName: string) {
        let storage = this.getStorage(storageName);
        let provider = this.getProvider(storage.provider);

        return provider.delete(storage, { name: fileName });
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
    getProvider(name: string) {
        for (let provider of this.providers) {
            if (provider.name == name) return provider;
        }
        throw new Error(`Asset provider ${name} not found`);
    }

}
