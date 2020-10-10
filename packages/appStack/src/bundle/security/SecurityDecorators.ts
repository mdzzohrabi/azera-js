import { Middleware, NextFn, Request, Response } from '../http';
import { AuthenticationManager } from './AuthenticationManager';

/**
 * Secure an http route (authentication middleware)
 * 
 * @param options Options
 */
export function Secure(options?: { role?: string, redirectPath?: string, anonymous?: boolean })
{
    return function secureDecorator(...params: any[]) {
        Middleware([
            [ AuthenticationManager, function secureMiddleware(authManager: AuthenticationManager ,req: Request, res: Response, next: NextFn) {
                let { role, redirectPath, anonymous } = options || {};

                authManager.authenticate(req, res).then(isOk => {

                    if (anonymous) return next();

                    if (isOk) {
                        next();
                    }
                    else {
                        if (redirectPath) res.redirect(redirectPath);
                        else next(Error(`Authentication failed`));
                    }
                })
                .catch(err => {
                    if (redirectPath) res.redirect(redirectPath);
                    else next(Error(`Authentication failed`));
                });
            }]
        ])(...params);
    }
}


/**
 * Security context provider
 */
export class SecurityContext<T> { context?: T }