import { NextFn, Request, Response } from '../http';
import { AuthenticationManager } from './authentication/AuthenticationManager';

/**
 * Generate secure http middleware
 * @param options Options
 * @returns 
 */
export function createSecureMiddleware(options?: { role?: string, redirectPath?: string, anonymous?: boolean, providerName?: string, [key: string]: any }) {
    return function secureMiddleware(authManager: AuthenticationManager, req: Request, res: Response, next: NextFn) {
        if (req.method.toLowerCase() == 'options') return next();   // CORS-preflight
        let { role, redirectPath, anonymous, providerName } = options || {};
    
        // Check client authentication
        authManager.verifyRequest(req, res, providerName, options).then(isOk => {
            // Allow anonymous
            if (anonymous) return next();

            // Authenticated
            if (isOk) {
                next();
            }
            // Faild
            else {
                // Redirect to given redirectRoute
                if (redirectPath) res.redirect(redirectPath);
                // or return Error
                else res.status(401).json({ error: 'Authentication failed' });
            }
        })
        .catch(err => {
            if (redirectPath) res.redirect(redirectPath);
            else res.status(401).json({ error: 'Authentication failed' });
        });
    }
}