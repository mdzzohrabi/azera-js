import { Middleware, NextFn, Request, Response } from '../http';
import { AuthenticationManager } from './AuthenticationManager';

export function Secure(options?: { role?: string, redirectPath?: string })
{
    return function secureDecorator(...params: any[]) {
        Middleware([
            [ AuthenticationManager, function secureMiddleware(authManager: AuthenticationManager ,req: Request, res: Response, next: NextFn) {
                let { role, redirectPath } = options || {};

                authManager.authenticate(req, res).then(isOk => {
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