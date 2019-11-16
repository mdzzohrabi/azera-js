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

    ['GET /type-definitions'](@Inject() apiManager: ApiManager, @Inject() res: Response) {
        res.end(apiManager.typeDefs.join("\n\n"));
    }

    ['GET /methods'](@Inject() apiManager: ApiManager, @Inject() res: Response) {
        return apiManager.apiMethods.map(({ name, public: published, description, endPoint }) => ({
            name, description, endPoint, published
        }));
    }

    ['GET /methods/:name'](@Inject() apiManager: ApiManager, @Inject() req: Request) {
        return apiManager.apiMethods.find(method => method.name == req.params.name) || {
            error: `Method ${req.params.name} not found`
        };
    }

}