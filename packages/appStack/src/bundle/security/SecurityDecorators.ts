import { Middleware, Request, Response, NextFn } from '../http';
import { Container } from '@azera/container';

export function Secure(role?: string)
{
    return function secureDecorator(...params: any[]) {
        Middleware([
            [ Container, function secureMiddleware(container: Container ,req: Request, res: Response, next: NextFn) {
                let token = req.headers.authorization?.substr('Bearer '.length);

                if (!token) {
                    return next(Error(`You must be logged in to access this path`));
                }
                
                auth.getByToken(token).then(user => {
                    if (!user) {
                        return next(Error(`Invalid authentication token`));
                    }
    
                    container.setAlias(User, user);
                    next();
                    container.setAlias(User, new User);
                }).catch(err => next(err));
                
            }]
        ])(...params);
    }
}