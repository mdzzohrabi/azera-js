import { Inject } from "@azera/container";
import { HashMap } from "@azera/util/is";
import { Response } from "../bundle/http";
import { RateLimiterLimit } from "./RateLimiterLimit";
import { AbstractRateLimitStrategy } from "./strategy/AbstractRateLimitStrategy";

/**
 * Rate Limiter that use Cache as Storage
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class RateLimiter {

    /** Limiter strategies */
    protected strategies: HashMap<AbstractRateLimitStrategy> = {}
    
    /** Defined rate limiters */
    protected limiters: HashMap<RateLimiterLimit> = {}
    
    constructor(  
        /** Strategies */     
        @Inject() strategies: AbstractRateLimitStrategy[] = [],
        /** Limiters */
        limiters: RateLimiterLimit[] = []
    ) {
        if (Array.isArray(strategies)) {
            strategies.forEach(s => this.strategies[s.name] = s);
        }

        if (Array.isArray(limiters)) {
            limiters.forEach(l => this.limiters[l.name] = l);
        }
    }

    /**
     * Add RateLimiter strategy
     * 
     * @param strategy Strategy instance
     */
    addStrategy(strategy: AbstractRateLimitStrategy) {
        this.strategies[strategy.name] = strategy;
        return this;
    }

    /** Get a limiter */
    limiter(name: string) {
        let limit = this.limiters[name];
        if (limit === undefined) {
            throw Error(`Limiter ${name} is not defined`);
        }
        return limit;
    }

    /** Create a new limiter */
    for(name: string) {
        var limiter = new RateLimiterLimit(name);
        this.limiters[name] = limiter;
        return limiter;
    }

    limiterStrategy(limit: RateLimiterLimit) {
        let strategy = this.strategies[limit.strategy];
        if (!strategy) throw Error(`RateLimiter strategy ${limit.strategy} for limit ${limit.name} not found`);
        return strategy;
    }

    /**
     * Try to allocate some tokens
     * 
     * @param limit RateLimiter
     * @param key RateLimiter key
     * @param tokens Number of tokens to allocate
     */
    async consume(limitName: string, key: string, tokens: number = 1): Promise<boolean> {
        let limiter = this.limiter(limitName);
        return this.limiterStrategy(limiter).consume(limiter, key, tokens);
    }

    /**
     * Get next retry date
     * 
     * @param limit RateLimiter
     * @param key RateLimiter key
     */
    async retryAfter(limitName: string, key: string): Promise<Date> {
        let limiter = this.limiter(limitName);
        return this.limiterStrategy(limiter).retryAfter(limiter, key);
    }

    /**
     * Retreive used tokens
     * 
     * @param limit RateLimiter
     * @param key RateLimiter key
     */
    async attempts(limitName: string, key: string): Promise<number> {
        let limiter = this.limiter(limitName);
        return this.limiterStrategy(limiter).attempts(limiter, key);
    }

    /**
     * Retreive available tokens
     * 
     * @param limit RateLimiter
     * @param key RateLimiter key
     */
    async remains(limitName: string, key: string): Promise<number> {
        let limiter = this.limiter(limitName);
        return this.limiterStrategy(limiter).remains(limiter, key);
    }

    /**
     * Set response headers for RateLimit
     * 
     * @param response Http Response
     * @param limitName Limit name
     * @param key Limit key
     */
    async setResponseHeaders(response: Response, limitName: string, key: string) {
        let limiter = this.limiter(limitName);
        let strategy = this.limiterStrategy(limiter);
        let [limit, remains, tryAfter] = [
            limiter.maxAttempts,
            await strategy.remains(limiter, key),
            await strategy.retryAfter(limiter, key)
        ];

        response.header('X-RateLimit-Limit', String(limit));
        response.header('X-RateLimit-Remaining', String(remains));
        response.header('X-RateLimit-Reset', String(tryAfter));
    }

}