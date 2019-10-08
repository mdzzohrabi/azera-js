import { EventEmitter } from 'events';
import { Inject, Service, Tag, Container } from '@azera/container';
import { Logger } from './Logger';
import { Kernel } from './Kernel';

/**
 * Event manager
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
@Service({
    factory: ($env: string, serviceContainer: Container) => {
        if ( $env == 'development' ) return new DebugEventManager(serviceContainer.invoke(Logger));
        return new EventManager();
    }
})
export class EventManager extends EventEmitter {    
}

class DebugEventManager extends EventManager {

    constructor(@Inject() private logger: Logger) {
        super();
    }

    emit(event: string, eventData: any) {
        this.logger.info(`Emit ${event}`);
        return super.emit(event, eventData);
    }
}