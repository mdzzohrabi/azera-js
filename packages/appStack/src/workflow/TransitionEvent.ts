import { Event } from '../event/EventManager';
import { WorkflowTransition } from './Workflow';

/**
 * Transition evnet
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class TransitionEvent<T> extends Event {
    constructor(
        public target: T,
        public oldPlace: string,
        public newPlace: string,
        public metadata: WorkflowTransition['metadata']
    ) { super(); }
}