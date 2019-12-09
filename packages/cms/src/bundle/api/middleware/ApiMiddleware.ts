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
                if (method.endPoint == req.path.replace(/\/$/, '') && method.public === true) {
                    let start = method.lastRun = Date.now();
                    let result = apiManager.run(method.script, {
                        request: req,
                        response: res
                    });
                    method.lastRunDelay = Date.now() - start;
                    return result;
                }
            }

            next();

        }
    }

}