import { Container, Inject } from '@azera/container';
import type { MongoClient } from 'mongodb';
import { MongoManager } from '../../bundle/mongo/MongoManager';
import { invariant } from '../../Util';
import { CacheProvider, CacheProviderOptions } from '../CacheProvider';

/**
 * Mongo cache provider
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class MongoCacheProvider extends CacheProvider {

    static readonly schema = 'mongodb';

    connection!: MongoClient;
    collectionName: string = 'cache';

    @Inject() container!: Container;

    async getDb() {
        if (this.connection) return this.connection;

        invariant(this.url, `MongoDb cache uri not specified`);

        let mongoManager = await this.container.invokeAsync(MongoManager);

        // Use connections from MongoBundle
        if (mongoManager.has(this.url?.hostname!)) {
            this.connection = await mongoManager.get(this.url?.hostname!);
            this.collectionName = this.url?.pathname!.substr(1)!;
        }
        else {
            let mongo = await import('mongodb');
            this.connection = await mongo.connect(this.url?.toString()!, { useNewUrlParser: true, useUnifiedTopology: true });
            this.collectionName = this.name;
        }

        return this.connection;
    }

    async getCollection() {
        let db = await this.getDb();
        return db.db().collection<{ key: string, value: any, createdAt: number, expire?: number }>(this.collectionName);
    }

    async has(key: string): Promise<boolean> {
        return await (await this.getCollection()).countDocuments({ key }) > 0;
    }
    
    async set<T>(key: string, value: T): Promise<T> {
        (await this.getCollection()).insertOne({ key, value, createdAt: Date.now() });
        return value;
    }

    async get<T>(key: string, expire?: number | undefined): Promise<T | undefined> {
        let result = await (await this.getCollection()).findOne({ key });
        if (result) {
            if ( expire && Date.now() - result.createdAt > expire ) return undefined;
            if ( result.expire && Date.now() - result.createdAt > result.expire ) return undefined;
            return result.value;
        }

        return undefined;
    }

    async expire(key: string, secs: number) {
        let result = await (await this.getCollection()).updateOne({ key }, { $set: { expire: secs } });
        return result.modifiedCount;
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

    async hit<T>(key: string): Promise<any | undefined> {
        return (await this.getCollection()).findOne({ key }) as any;
    }

    async delete(key: string): Promise<number> {
        return (await (await this.getCollection()).deleteMany({ key })).deletedCount ?? 0;
    }

}