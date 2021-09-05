/**
 * RateLimiter Limit object
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class RateLimiterLimit {

    constructor(
        /** Limit signature key */
        public name: string,
        /** The maximum number of attempts allowed within the given number of seconds. */
        public maxAttempts: number = 60,
        /** The number of seconds until the rate limit is reset. */
        public decaySeconds: number = 1,
        /** Rate limiter strategy name */
        public strategy: string = 'fixed_window',
        /** Cache provider name */
        public cacheProviderName?: string
    ) {}

    /** The response generator callback. */
    responseCallback?: Function;

    /**
     * Create a new rate limit.
     */
    public perSecond(maxAttempts: number, decaySeconds: number = 1)
    {
        this.maxAttempts = maxAttempts;
        this.decaySeconds = decaySeconds;
        return this;
    }

    /**
     * Create a new rate limit.
     */
    public perMinute(maxAttempts: number)
    {
        this.maxAttempts = maxAttempts;
        this.decaySeconds = 60;
        return this;
    }

    /**
     * Create a new rate limit using minutes as decay time.
     */
    public perMinutes(decayMinutes: number, maxAttempts: number)
    {
        this.maxAttempts = maxAttempts;
        this.decaySeconds = decayMinutes * 60;
        return this;
    }

    /**
     * Create a new rate limit using hours as decay time.
     */
    public perHour(maxAttempts: number, decayHours: number = 1)
    {
        this.maxAttempts = maxAttempts;
        this.decaySeconds = 60 * 60 * decayHours;
        return this;
    }

    /**
     * Create a new rate limit using days as decay time.
     */
    public perDay(maxAttempts: number, decayDays: number = 1)
    {
        this.maxAttempts = maxAttempts;
        this.decaySeconds = 60 * 60 * 24 * decayDays;
        return this;
    }

    /**
     * Create a new unlimited rate limit.
     */
    public none()
    {
        this.maxAttempts = Infinity;
        return this;
    }

    /**
     * Set cache provider name
     */
    public withCache(providerName: string) {
        this.cacheProviderName = providerName;
        return this;
    }

    /** Set rate limiter strategy */
    public withStrategy(name: string) {
        this.strategy = name;
        return this;
    }

    /**
     * Set the callback that should generate the response when the limit is exceeded.
     */
    public response(callback: Function)
    {
        this.responseCallback = callback;
        return this;
    }
}