import { Controller, Tag, Middleware, HttpBundle, Inject, Request, Response } from '@azera/stack';
import { ApiManager } from '../ApiManager';

@Controller('/portal/api')
@Tag('portal.module')
@Middleware([ HttpBundle.static(__dirname + '/public') ])
export class ApiPortalController {

    get moduleAssetPath() {
        return '/portal/api/apiPortalModule.js';
    }

    ['GET /functions'](@Inject() apiManager: ApiManager) {
        return Object.keys(apiManager.functions).map(funcName => {
            return { functionName: funcName };
        });
    }

    /**
     * Type definitions file
     * @param apiManager ApiManager
     */
    ['GET /type-definitions'](@Inject() apiManager: ApiManager, req: Request, res: Response) {
        res.end(apiManager.typeDefs.toString());
    }

    /**
     * Api methods list
     * @param apiManager ApiManager
     */
    ['GET /methods'](@Inject() apiManager: ApiManager) {
        return apiManager.apiMethods.map(({ name, public: published, description, endPoint, lastRun, lastRunDelay }) => ({
            name, description, endPoint, published, lastRun, lastRunDelay
        }));
    }

    /**
     * Retreive an api method properties
     * @param apiManager ApiManager
     * @param req Request
     */
    ['GET /methods/:name'](@Inject() apiManager: ApiManager, req: Request) {
        if (!req.params) return { error: 'No request parameters' }
        return apiManager.apiMethods.find(method => method.name == req.params.name) || {
            error: `Method ${req.params.name} not found`
        };
    }

    /**
     * Edit an api method properties
     * @param apiManager ApiManager
     * @param req Request
     */
    ['PUT /methods/:name'](@Inject() apiManager: ApiManager, req: Request) {

        let apiName = req.params.name;
        let body = req.body;
        let method = apiManager.apiMethods.find(method => method.name == req.params.name);

        if (!method) return {
            error: `Method ${req.params.name} not found`
        };

        if (body.script)
            method.script = body.script;
        
        return { ok: true, message: `Method modified successfull` };
    }

    /**
     * Create a new api method properties
     * @param apiManager ApiManager
     * @param req Request
     */
    ['POST /methods'](@Inject() apiManager: ApiManager, req: Request) {

        let body = req.body;

        if (!body.name) return {
            error: `Method has no name`
        };

        body.public = body.published === true;;

        apiManager.addMethod(body);
        
        return { ok: true, message: `Method added successfull` };
    }

}