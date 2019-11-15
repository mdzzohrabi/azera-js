import { IFactory, Middleware, Container, HttpBundle } from '@azera/stack';

@Middleware()
export class PortalPublicMiddlewareFactory implements IFactory {

    create(serviceContainer: Container) {

        return HttpBundle.static(__dirname)

    }
    
}