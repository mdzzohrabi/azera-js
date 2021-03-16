import { RateLimiterLimit } from "../RateLimiterLimit";

/**
 * Abstract Rate-limiter strategy
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export abstract class AbstractRateLimitStrategy {

    /** Strategy name */
    abstract name: string;

    /**
     * Try to allocate some tokens
     * @param limit RateLimiter
     * @param key RateLimiter key
     * @param tokens Number of tokens to allocate
     */
    abstract consume(limit: RateLimiterLimit, key: string, tokens: number): Promise<boolean>;

    /**
     * Get next retry date
     * @param limit RateLimiter
     * @param key RateLimiter key
     */
    abstract retryAfter(limit: RateLimiterLimit, key: string): Promise<Date>;

    /**
     * Retreive used tokens
     * @param limit RateLimiter
     * @param key RateLimiter key
     */
    abstract attempts(limit: RateLimiterLimit, key: string): Promise<number>;

    /**
     * Retreive available tokens
     * @param limit RateLimiter
     * @param key RateLimiter key
     */
    abstract remains(limit: RateLimiterLimit, key: string): Promise<number>;

}