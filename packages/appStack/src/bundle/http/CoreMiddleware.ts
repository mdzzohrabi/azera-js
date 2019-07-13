import { Container, Inject } from '@azera/container';
import { Middleware } from './Middleware';
import { Request } from './Request';
import { Response } from './Response';
import { IFactory } from '@azera/container';

@Middleware()
export class HttpCoreMiddlewareFactory implements IFactory {

    create( @Inject() serviceContainer: Container ) {
        return function coreMiddleWare(req: any, res: any, next: any) {

            serviceContainer
                // Request
                .setFactory(Request, function requestFactory() { return req; })
                // Response
                .setFactory(Response, function responseFactory() { return res; });

            next();
        }
    }

}