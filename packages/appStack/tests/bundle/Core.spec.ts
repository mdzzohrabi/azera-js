import { Container } from "@azera/container";
import { CacheManager } from "../../src/cache";
import { CoreBundle } from "../../src/bundle/core/CoreBundle";
import { Kernel } from '../../src/Kernel';
import { deepStrictEqual, strictEqual } from "assert";
import { WebClient } from "../../src";

describe('CoreBundle', () => {

    let kernel: Kernel;
    let coreBundle: CoreBundle;
    let container: Container;

    beforeEach(() => {
        coreBundle = new CoreBundle();
        container = new Container();
        kernel = new Kernel('test', [ coreBundle ], container);
    });

    it('Cache configuration', async () => {
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
        await kernel.loadConfig({
            web_client: { proxy: '127.0.0.1:9090' }
        });

        await kernel.boot();

        let webClient = await kernel.container.invokeAsync(WebClient);

        strictEqual(webClient.proxyAddress, '127.0.0.1:9090');
    });

});