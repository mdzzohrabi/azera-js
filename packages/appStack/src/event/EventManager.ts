import { Container, Inject, Service } from '@azera/container';
import { forEach, is } from '@azera/util';
import { EventEmitter } from 'events';
import { Logger } from '../logger/Logger';
import { Profiler } from '../debug/Profiler';
import { debugName } from '../helper/Util';

export const EVENT_SUBSCRIBER_TAG = 'event.subscriber';

/**
 * Event manager
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
// @ts-ignore
@Service({
    factory: async ($isDevelopment: string, serviceContainer: Container) => {
        // Use DebugEventManager is Development environment
        let manager = $isDevelopment ?
            new DebugEventManager(
                serviceContainer.invoke(Logger),
                serviceContainer.invoke(Profiler)
            )
            : new EventManager();

        // Find tagged subscubers
        let subscribers = serviceContainer.getByTag<IEventSubscriber>(EVENT_SUBSCRIBER_TAG);
        subscribers.forEach(subscriber => manager.subscribe(subscriber));

        return manager;
    },

    // Auto-tagging services that implements IEventSubScriber or it's name ends with EventSubscriber
    autoTags: [function eventSubscriberTagger(service) {
        if (service.name.endsWith('EventSubscriber') || (is.Object(service.service) && 'getSubscribedEvents' in service.service)) return [EVENT_SUBSCRIBER_TAG];
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
            throw Error(`Event SubScriber must be instance of a IEventSubscriber, ${debugName(subscriber)} given`);
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

        forEach(subscriber.getSubscribedEvents(), (listeners, eventName) => {
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