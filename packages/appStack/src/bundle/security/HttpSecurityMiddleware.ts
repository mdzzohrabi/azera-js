import { IFactory, Inject, Container } from '@azera/container';
import { Middleware, Request, Response, NextFn } from '../http';

@Middleware()
export class HttpSecurityMiddlewareFactory implements IFactory {
    
    @Inject() create(container: Container) {
        return function httpSecurityMiddleware(req: Request, res: Response, next: NextFn) {

        }
    }

}