export interface WorkflowTransition {
    from: string | string[];
    to: string;
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
}