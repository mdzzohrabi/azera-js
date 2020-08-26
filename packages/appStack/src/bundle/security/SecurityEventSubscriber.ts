import { IEventSubscriber, SubscriberEventsCollections } from '../../EventManager';
import { HttpBundle, express } from '../http';
import { Inject } from '@azera/container';

export class SecurityEventSubscriber implements IEventSubscriber {

    @Inject('$config') $config: any;
    
    getSubscribedEvents(): SubscriberEventsCollections {
        return {
            [HttpBundle.EVENT_EXPRESS_INIT]: this.initHttpServer
        }
    }

    initHttpServer(server: express.Express) {
        console.log('Security bundle prepare http server');
        
    }

}