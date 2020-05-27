import { invariant } from '../Util';

export interface WorkflowTransition {
    from: string | string[];
    to: string;
    guard?: (target: any) => boolean;
    metadata?: {
        [name: string]: any;
    };
}

export interface WorkflowTransitions {
    [name: string]: WorkflowTransition;
}

export class Workflow {
    constructor(
        public name: string,
        public places: string[],
        public initial: string,
        public supports: Function[] = [],
        public transitions: WorkflowTransitions = {},
        public property: string = 'state'
    ) {}

    /**
     * Check if given target supported by current workflow
     * @param target Target
     */
    public accept?(target: any): boolean {
        return this.supports.find(s => target instanceof s) !== undefined;
    }

    public can(target: any, transition: string): boolean {
        let { transitions, property } = this;
        invariant(transitions[transition], 'Transition "%s" not found in workflow "%s"', transition, this.name);
        let { from, to, guard } = transitions[transition];
        let currentState = target[property];
        return (typeof from == 'string' ? from == currentState : from.includes(currentState)) && (!guard || guard(target));
    }
}