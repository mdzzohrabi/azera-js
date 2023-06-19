import { ok, strictEqual } from "assert";
import { FileCacheProvider, MemoryCacheProvider, RedisCacheProvider, wait } from "../src";

describe('Cache', () => {

    it('cache providers alias name', () => {
        strictEqual(MemoryCacheProvider.schema, 'memory');
        strictEqual(FileCacheProvider.schema, 'file');
        strictEqual(RedisCacheProvider.schema, 'redis');
    });

    it('memory', async function () {
        this.timeout(10000);

        let memory = new MemoryCacheProvider();

        strictEqual( await memory.has('a') , false );
        strictEqual( await memory.get('a') , undefined );
        
        await memory.set('a', 59);
        strictEqual( await memory.get('a') , 59 );
        strictEqual( await memory.has('a') , true );
        await memory.delete('a');
        strictEqual( await memory.has('a') , false );
        strictEqual( await memory.get('a') , undefined );
        
        strictEqual(
            await memory.memo('a', async () => 59),
            59
        );
        strictEqual(
            await memory.memo('a', async () => 51),
            59
        );
        strictEqual( await memory.get('a') , 59 );
        strictEqual( await memory.has('a') , true );
        await memory.delete('a');
        strictEqual( await memory.has('a') , false );
        strictEqual( await memory.get('a') , undefined );

        // Expire
        await memory.set('permanent', 10);
        strictEqual(await memory.get('permanent'), 10);
        strictEqual(await memory.get('permanent', 100), 10);
        await wait(200);
        strictEqual(await memory.get('permanent', 100), undefined);
            
    });

    it('file', async () => {

        let cache = new FileCacheProvider();
        cache.name = 'file';
        cache.url = new URL((__dirname.includes(':') ? '' : 'file://') +  __dirname + '/../var/cache');

        strictEqual( await cache.has('a') , false );
        strictEqual( await cache.get('a') , undefined );
        
        await cache.set('a', 59);
        strictEqual( await cache.get('a') , 59 );
        strictEqual( await cache.has('a') , true );
        await cache.delete('a');
        strictEqual( await cache.has('a') , false );
        strictEqual( await cache.get('a') , undefined );
        
        strictEqual(
            await cache.memo('a', async () => 59),
            59
        );
        strictEqual(
            await cache.memo('a', async () => 51),
            59
        );
        strictEqual( await cache.get('a') , 59 );
        strictEqual( await cache.has('a') , true );
        await cache.delete('a');
        strictEqual( await cache.has('a') , false );
        strictEqual( await cache.get('a') , undefined );

    });

})