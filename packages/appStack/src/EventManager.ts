import { Container, Inject, Service } from '@azera/container';
import { forEach } from '@azera/util';
import { EventEmitter } from 'events';
import { Logger } from './Logger';
import { debugName } from './Util';
import { Profiler } from './Profiler';

export const EVENT_SUBSCRIBER_TAG = 'event.subscriber';

/**
 * Event manager
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
@Service({
    factory: ($env: string, serviceContainer: Container) => {
        let manager = $env == 'development' ? new DebugEventManager(serviceContainer.invoke(Logger), serviceContainer.invoke(Profiler)) : new EventManager();
        
        let subscribers = serviceContainer.getByTag(EVENT_SUBSCRIBER_TAG);
        subscribers.forEach(subscriber => manager.subscribe(subscriber as any));

        return manager;
    },

    autoTags: [function eventSubscriberTagger(service) {
        if (service.name.endsWith('EventSubscriber')) return [ EVENT_SUBSCRIBER_TAG ];
        return [];
    }]
})
export class EventManager extends EventEmitter {

    /**
     * Subscribe an event subscriber
     * @param subscriber Event subsriber
     */
    subscribe(subscriber: IEventSubscriber) {

        if (!subscriber || typeof subscriber['getSubscribedEvents'] != 'function') {
            throw Error(`Event SubScriber must be instance of a IEventSubscriber, ${ debugName(subscriber) } given`);
        }

        let addListener = (eventName: string, listener: any) => {
            if (typeof listener == 'string') {
                this.on(eventName, (subscriber as any)[listener].bind(subscriber));
            } else if (typeof listener == 'function') {
                this.on(eventName, listener);
            } else {
                throw Error(`Event listener must be instance of Function or a method name that exists in subscriber`);
            }
        }

        forEach( subscriber.getSubscribedEvents() , (listeners, eventName) => {
            if (Array.isArray(listeners)) {
                listeners.forEach((listener: any) => {
                    addListener(eventName, listener);
                });
            } else {
                addListener(eventName, listeners);
            }
        });

    }

    raise<T>(name: string, event: T) {
        this.emit(name, event);
        return event;
    }

}

class DebugEventManager extends EventManager {

    constructor(
    @Inject() private logger: Logger,
    @Inject() private profiler: Profiler) { super() }

    emit(event: string, eventData: any) {
        this.logger.debug(`EventManager emit '${event}'`);
        let profiler = this.profiler.start('event.' + event);
        let result = super.emit(event, eventData);
        profiler?.end();
        return result;
    }
}

export type SubscriberEventsCollections = {
    [eventName: string]: Function | Function[] | string | string[]
}

export interface IEventSubscriber {
    getSubscribedEvents(): SubscriberEventsCollections
}


export class Event {
    public defaultPrevented: boolean = false;
    
    public preventDefault() {
        this.defaultPrevented = true;
    }
}