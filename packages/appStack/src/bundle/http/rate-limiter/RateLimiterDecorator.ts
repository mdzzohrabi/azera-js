import { Container } from "@azera/container";
import { is } from "@azera/util";
import { Middleware } from "../decorator/Middleware";
import { createRateLimiterMiddleware, RateLimiterMiddlewareOptions } from "./RateLimiterMiddleware";

/**
 * RateLimiter middleware
 * @param name Limiter name
 * @param requestKey Request key path or key extractor function
 * @returns 
 */
 export function UseRateLimit(limiterName: string, options: RateLimiterMiddlewareOptions): any
 export function UseRateLimit(limiterName: string, requestKey: string, options?: Omit<RateLimiterMiddlewareOptions, 'requestKey'>): any
 export function UseRateLimit(limiterName: string, requestKey: any, options?: RateLimiterMiddlewareOptions): any
 {
     if (is.Object(requestKey)) [options, requestKey] = [requestKey as any, options];
     else options = { requestKey, ...(options || {}) } as any;
     options = { limiterName, ...options } as any;
     let rateLimiterMiddle = createRateLimiterMiddleware(options as any);
 
     return Middleware([
         [Container, rateLimiterMiddle]
     ]);
 }