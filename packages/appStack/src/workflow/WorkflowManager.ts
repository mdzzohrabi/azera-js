import { Workflow } from './Workflow';
import { invariant } from '../Util';
import { TransitionError } from './TransitionError';
import { forEach } from '@azera/util';
import { EventManager } from '../EventManager';
import { Inject } from '@azera/container';
import { TransitionEvent } from './TransitionEvent';

/**
 * Workflow manager
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class WorkflowManager {

    constructor(
        @Inject() public eventManager: EventManager,
        @Inject() public workflows: Workflow[] = []
    ) {}

    public addWorkflow(workflow: Workflow) {
        this.workflows.push(workflow);
        return this;
    } 

    public get(workflowName: string, target?: any) {
        let workflow = this.workflows.find(w => w.name == workflowName);
        invariant(workflow, 'Workflow "%s" not found', workflowName);
        if (target) {
            invariant(typeof target == 'object', 'Only objects can be use as workflow target, but type of "%s" given', typeof target);
            invariant(this.accept(target, workflow!), 'Workflow "%s" doest not accept given object', workflow!.name);
        }
        return workflow!;
    }

    public accept(target: object, workflow: Workflow): boolean {
        invariant(typeof workflow == 'object', `Workflow must be typeof object, type of "%s" given`, typeof workflow);
        return workflow.accept ? workflow.accept(target) : workflow.supports.find(s => target instanceof s) !== undefined;
    }

    public apply(target: any, workflowName: string, transition: string) {
        let workflow = this.get(workflowName, target);
        let { transitions, property } = workflow!;
        invariant(transitions[transition], 'Transition "%s" not found in workflow "%s"', transition, workflowName);
        let { from, to, metadata } = transitions[transition];
        let currentState = target[property];
        if (typeof from == 'string' ? from == currentState : from.includes(currentState)) {
            this.eventManager.emit(`workflow.transition`, new TransitionEvent(target, currentState, to, metadata));
            this.eventManager.emit(`workflow.${workflowName}.${transition}`, new TransitionEvent(target, currentState, to, metadata));
            target[property] = to;
            this.eventManager.emit(`workflow.${workflowName}.${transition}.after`, new TransitionEvent(target, currentState, to, metadata));
            this.eventManager.emit(`workflow.transition.after`, new TransitionEvent(target, currentState, to, metadata));
        } else {
            throw new TransitionError(`Cannot apply transition "${transition}" from "${currentState}", allowed source states: ${Array.isArray(from) ? from.join(', '): from}`);
        }
    }

    public can(target: any, workflowName: string, transition: string) {
        let workflow = this.get(workflowName, target);
        let { transitions, property } = workflow;
        invariant(transitions[transition], 'Transition "%s" not found in workflow "%s"', transition, workflowName);
        let { from, to } = transitions[transition];
        let currentState = target[property];
        return typeof from == 'string' ? from == currentState : from.includes(currentState);
    }

    public allowedTransitions(target: any, workflowName: string) {
        let workflow = this.get(workflowName, target);
        let { transitions, property } = workflow;
        let result: string[] = [];
        let currentState = target[property];
        forEach(transitions, (transition, name) => {
            let { from, to } = transition;
            if (typeof from == 'string' ? from == currentState : from.includes(currentState)) {
                result.push(name);
            }
        });
        return result;
    }


}