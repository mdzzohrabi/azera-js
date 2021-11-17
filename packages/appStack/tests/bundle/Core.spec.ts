import { deepStrictEqual, strictEqual } from "assert";
import { WebClient } from "../../src/net/WebClient";
import { CacheManager } from "../../src/cache/CacheManager";
import { Kernel } from '../../src/kernel/Kernel';

describe('CoreBundle', () => {
    it('Cache configuration', async function () {
        this.timeout(4000);
        let kernel = new Kernel('test');

        await kernel.loadConfig({
            cache: {
                providers: {
                    memory: { type: 'memory' },
                    file: { type: 'file', path: './var/cache' },
                    redis: 'redis://redis_user:redis_password@localhost:6379'
                }
            }
        });

        await kernel.boot();
        let cacheManager = await kernel.container.invokeAsync(CacheManager);

        deepStrictEqual(Object.keys(cacheManager.providers), ['memory', 'file', 'redis']);

        let redis = cacheManager.get('redis');
        strictEqual(redis.url?.username, 'redis_user');
    });

    it('WebClient', async () => {
        let kernel = new Kernel('test');

        await kernel.loadConfig({
            web_client: { proxy: '127.0.0.1:9090' }
        });

        await kernel.boot();

        let webClient = await kernel.container.invokeAsync(WebClient);

        strictEqual(webClient.proxyAddress, '127.0.0.1:9090');
    });

});