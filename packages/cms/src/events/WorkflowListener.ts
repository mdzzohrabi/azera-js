import { TransitionEvent, Inject, Logger } from '@azera/stack';

export class WorkflowListener {

    beforeTransition(@Inject() logger: Logger, event: TransitionEvent<any>) {
        logger.info(`Before transition event ! hooray`, event);
    }

}