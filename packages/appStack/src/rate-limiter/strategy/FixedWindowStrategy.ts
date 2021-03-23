import { Inject } from "@azera/container";
import { CacheManager } from "../..";
import { RateLimiterLimit } from "../RateLimiterLimit";
import { AbstractRateLimitStrategy } from "./AbstractRateLimitStrategy";

/**
 * Fixed-Window Rate-limiting strategy
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class FixedWindowStrategy extends AbstractRateLimitStrategy {
    name: string = 'fixed_window';

    constructor(
        @Inject() protected cacheManager: CacheManager
    ) { super(); }

    protected cacheKey(limit: RateLimiterLimit, key: string) {
        return 'limit_' + limit.name + '_' + key;
    }

    async consume(limit: RateLimiterLimit, key: string, tokens: number): Promise<boolean> {
        let cacheKey = this.cacheKey(limit, key);
        let store = this.cacheManager.get(limit.cacheProviderName);
        let isExpired = !await store.has(cacheKey + '-timer', limit.decaySeconds * 1000);
        let attempts = isExpired ? 0 : await store.get<number>(cacheKey) ?? 0;
        if (limit.maxAttempts - attempts >= tokens) {
            if (isExpired) await store.set(cacheKey + '-timer', Date.now());
            await store.set(cacheKey, attempts + tokens);
            return true;
        }
        return false;
    }

    async getTimer(limit: RateLimiterLimit, key: string): Promise<number | undefined> {
        let { decaySeconds, cacheProviderName } = limit;
        let cacheKey = this.cacheKey(limit, key);
        let store = this.cacheManager.get(cacheProviderName);
        return await store.get<number>(cacheKey + '-timer', decaySeconds * 1000);
    }

    async retryAfter(limit: RateLimiterLimit, key: string): Promise<Date> {
        let timer = await this.getTimer(limit, key);
        if (timer !== undefined) {
            return new Date(timer + (limit.decaySeconds * 1000));
        }
        return new Date();
    }

    async attempts(limit: RateLimiterLimit, key: string): Promise<number> {
        if (await this.getTimer(limit, key)) {
            return await this.cacheManager.get(limit.cacheProviderName).get<number>(this.cacheKey(limit, key)) ?? 0;
        }
        return 0;
    }

    async remains(limit: RateLimiterLimit, key: string) {
        return limit.maxAttempts - await this.attempts(limit, key);
    }

}