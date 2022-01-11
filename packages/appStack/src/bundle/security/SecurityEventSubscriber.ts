import { IEventSubscriber, SubscriberEventsCollections } from '../../event/EventManager';
import { HttpBundle, express, HttpRouteConfigEvent } from '../http';
import { Container, Inject } from '@azera/container';
import { Logger } from '../../logger/Logger';
import { createSecureMiddleware } from './HttpSecurityMiddleware';
import { AuthenticationManager } from './authentication/AuthenticationManager';

/**
 * Security event-subscriber
 */
export class SecurityEventSubscriber implements IEventSubscriber {

    @Inject('$config') $config: any;

    @Inject() logger!: Logger;

    @Inject() container!: Container;
    
    getSubscribedEvents(): SubscriberEventsCollections {
        return {
            [HttpBundle.EVENT_EXPRESS_INIT]: this.initHttpServer,
            [HttpBundle.EVENT_CONFIGURE_ROUTE]: this.httpRouteConfig
        }
    }

    initHttpServer(server: express.Express) {
        this.logger?.debug('Security bundle prepare http server');
    }

    httpRouteConfig(event: HttpRouteConfigEvent) {
        if ('secure' in event.config && (event.config as any)['secure']) {
            let options: any = {};
            if (typeof (event.config as any)['secure'] == 'object') {
                options = (event.config as any)['secure'];
            }
            event.route.middlewares.push(createSecureMiddleware(options).bind(this, this.container.invoke(AuthenticationManager)));
        }
    }

}