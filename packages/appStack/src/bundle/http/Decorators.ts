import { Container } from '@azera/container';
import { is } from '@azera/util';
import * as fileUploader from 'express-fileupload';
import { createDecorator, createMetaDecorator } from '../../decorator/Metadata';
import { Middleware } from './Middleware';
import { createRateLimiterMiddleware, RateLimiterMiddlewareOptions } from './middleware/RateLimiterMiddleware';

/**
 * Template annotation
 * s
 * Set template for an action
 */
export const Template = createMetaDecorator<string, false>('http:template', false, false);

/**
 * Header annotation
 * 
 * Set header item for a controller or an action
 */
export const Header = createDecorator((key: string, value: string) => ({ key, value }), 'http:header', true);


/**
 * File upload middleware
 * @param options File upload options
 */
export function HttpFileUpload(options?: fileUploader.Options) {
    return Middleware([
        fileUploader(options)
    ])
}

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