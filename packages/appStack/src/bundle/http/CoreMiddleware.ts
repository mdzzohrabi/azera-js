import { Container, Inject, Service } from '@azera/container';
import { Request } from './Request';
import { Response } from './Response';

@Service({ tags: [ 'http.middleware' ] })
export class HttpCoreMiddlewareFactory {

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