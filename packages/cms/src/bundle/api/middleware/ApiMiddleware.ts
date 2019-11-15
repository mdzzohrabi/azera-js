import { IFactory, Middleware, Inject, Container, Request, Response } from '@azera/stack';
import { ApiManager } from '../ApiManager';

@Middleware()
export class ApiMiddlewareFactory implements IFactory {
    
    create(serviceContainer: Container) {

        let apiManager = serviceContainer.invoke(ApiManager);

        /**
         * Api endPoint dispatcher
         */
        return function apiMiddleware(req: Request, res: Response, next: Function) {

            for (let method of apiManager.apiMethods) {
                if (method.endPoint == req.path) {
                    console.log(`Api Method`, method.endPoint, method.name);
                    apiManager.run(method.script);
                }
            }

            next();

        }
    }

}