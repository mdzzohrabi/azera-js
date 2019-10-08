import { Container, Inject } from '@azera/container';
import { Middleware } from './Middleware';
import { Request } from './Request';
import { Response } from './Response';
import { IFactory } from '@azera/container';

@Middleware()
export class HttpCoreMiddlewareFactory implements IFactory {

    create( @Inject() serviceContainer: Container ) {
        return function AzeraHttpBundleCoreMiddleWare(req: Request, res: Response, next: any) {

            serviceContainer
                .setParameter('http.req', req)
                .setParameter('http.res', res)
            ;

            next();

        }
    }

}