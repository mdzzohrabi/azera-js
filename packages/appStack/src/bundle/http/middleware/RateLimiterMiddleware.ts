import { Container } from "@azera/container";
import { is } from "@azera/util";
import { getProperty } from "../../../helper/Util";
import { RateLimiter } from "../../../rate-limiter";
import { Request } from "../Request";
import { NextFn, Response } from "../Response";

export interface RateLimiterMiddlewareOptions {
    limiterName: string
    requestKey: string | ((req: Request, res: Response) => string) | any[]
    tokens?: number | ((req: Request, res: Response) => number)
    message?: string
}

/**
 * Create a RateLimiter http middleware
 * @param container Container
 * @param rateLimiter RateLimiter
 * @param options Options
 * @returns 
 */
export function createRateLimiterMiddleware(options: RateLimiterMiddlewareOptions) {
    let { limiterName, requestKey, tokens, message } = options;
    return function (container: Container, req: Request, res: Response, next: NextFn) {
        let rateLimiter = container.invoke(RateLimiter);
        
        // Limiter key
        let key = is.String(requestKey) ? getProperty<string>(req, requestKey) : container.invokeLater(requestKey)(req, res);
        tokens = is.Function(tokens) ? tokens(req, res) : tokens ?? 1

        // Check for RateLimiter token
        if (!rateLimiter.consume(limiterName, key, tokens)) {
            rateLimiter.setResponseHeaders(res, limiterName, key);
            res.status(429).end(message ?? 'Rate limit exceeded');
            return;
        }

        next();
    }
}