import { Storage } from '../Storage';
import { File } from '../File';

/**
 * Abstrat Asset Provider
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export abstract class AssetProvider {

    /** Provider name */
    abstract name: string;

    /**
     * Save a file and return its path
     * 
     * @param fileName File name to save
     * @param buffer File content
     */
    abstract save(storage: Storage, file: File): Promise<string>
    
    /**
     * Read a file as buffer
     * 
     * @param fileName File name
     */
    abstract read(storage: Storage, file: File): Promise<Buffer>

    /**
     * Delete a file
     * 
     * @param fileName File name
     */
    abstract delete(storage: Storage, file: File): Promise<boolean>

    /**
     * List of files
     * 
     * @param storage Storage
     * @param path Path to search
     */
    abstract list(storage: Storage, path?: string): Promise<Omit<File, 'content'>[]>

}