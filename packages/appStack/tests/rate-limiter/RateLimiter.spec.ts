import { ok, strictEqual } from "assert";
import { CacheManager, MemoryCacheProvider, wait } from "../../src";
import { FixedWindowStrategy, RateLimiter } from "../../src/rate-limiter";

describe('RateLimiter', () => {

    it('should works ok (Fixed-window strategy)', async function() {
        this.timeout(1000);

        let cache = new CacheManager([
            (() => {
                let provider = new MemoryCacheProvider()
                provider.name = 'memory';
                return provider;
            })()
        ]);

        let limiter = new RateLimiter([
            new FixedWindowStrategy(cache)
        ]);
        
        // Free Api
        limiter.for('free_api').perSecond(10, 0.2 /** 200 ms */).withStrategy('fixed_window');

        for (let i = 1; i <= 10; i++) {
            ok(await limiter.consume('free_api', '127.0.0.1', 1), `"free_api" must consume 1 token for "127.0.0.1"`);
            strictEqual(await limiter.attempts('free_api', '127.0.0.1'), i, `"free_api" attempts for "127.0.0.1" must be ${i}`);
            strictEqual(await limiter.remains('free_api', '127.0.0.1'), 10 - i, `"free_api" remains for "127.0.0.1" must be ${10 - i}`);
        }
        
        strictEqual(await limiter.consume('free_api', '127.0.0.1'), false, `"free_api" limit for "127.0.0.1" must be reachs`);
        strictEqual(await limiter.consume('free_api', '192.168.1.1'), true, `"free_api" limit for "192.168.1.1" must not be reachs`);

        // After 200 ms
        await wait(250);

        for (let i = 1; i <= 10; i++) {
            ok(await limiter.consume('free_api', '127.0.0.1', 1), `"free_api" must consume 1 token for "127.0.0.1"`);
            strictEqual(await limiter.attempts('free_api', '127.0.0.1'), i, `"free_api" attempts for "127.0.0.1" must be ${i}`);
            strictEqual(await limiter.remains('free_api', '127.0.0.1'), 10 - i, `"free_api" remains for "127.0.0.1" must be ${10 - i}`);
        }
        
        strictEqual(await limiter.consume('free_api', '127.0.0.1'), false, `"free_api" limit for "127.0.0.1" must be reachs`);
        strictEqual(await limiter.consume('free_api', '192.168.1.1'), true, `"free_api" limit for "192.168.1.1" must not be reachs`);

        // VIP Api
        limiter.for('vip_api').perMinute(100).withStrategy('fixed_window');

        for (let i = 1; i <= 100; i++) {
            ok(await limiter.consume('vip_api', '127.0.0.1', 1), `"vip_api" must consume 1 token for "127.0.0.1"`);
            strictEqual(await limiter.attempts('vip_api', '127.0.0.1'), i, `"vip_api" attempts for "127.0.0.1" must be ${i}`);
            strictEqual(await limiter.remains('vip_api', '127.0.0.1'), 100 - i, `"vip_api" remains for "127.0.0.1" must be ${100 - i}`);
        }
        
        strictEqual(await limiter.consume('vip_api', '127.0.0.1'), false, `"vip_api" limit for "127.0.0.1" must be reachs`);
        strictEqual(await limiter.consume('vip_api', '192.168.1.1'), true, `"vip_api" limit for "192.168.1.1" must not be reachs`);

    })

})