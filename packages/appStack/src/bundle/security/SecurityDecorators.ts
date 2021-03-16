import { Middleware } from '../http';
import { AuthenticationManager } from './authentication/AuthenticationManager';
import { createSecureMiddleware } from './HttpSecurityMiddleware';

/**
 * Secure an http route (authentication middleware)
 * 
 * @param options Options
 */
export function Secure(options?: { role?: string, redirectPath?: string, anonymous?: boolean, providerName?: string, [key: string]: any })
{
    let secureMiddleware = createSecureMiddleware(options);
    return function secureDecorator(...params: any[]) {
        Middleware([
            [ AuthenticationManager, secureMiddleware ]
        ])(...params);
    }
}


/**
 * Security context provider
 */
export class SecurityContext<T> { context?: T }