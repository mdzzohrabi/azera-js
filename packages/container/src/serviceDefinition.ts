import { is } from "@azera/util";
import { IPropertyInjection, Factory, IAutoTagger, IArgumentConverterFunction, Constructor } from "./types";
import { isFactory } from "./util";

export class ServiceDefinition<T = Function> {
    // Service name
    name!: string;
    // Service function or class
    service?: T;
    // Constructor parameters
    parameters: (string | Function)[] = [];
    // Function/Class properties
    properties: { [name: string] : string | Function | IPropertyInjection } = {};
    // Methods injections
    methods: { [name: string]: (string | Function)[]; } = {};
    // Call methods
    calls: { [name: string]: (string | Function)[]; } = {};
    // Private service flag
    private: boolean = false;
    // Service is factory instead of orginal service
    isFactory: boolean = false;
    // Factory function
    factory?: Factory<T>;
    // Service tags
    tags: string[] = [];
    // Invoke service instead of create instance
    invoke: boolean = false;
    // Imports files or services
    imports: (string | Function)[] = [];
    // Auto tagging definition
    autoTags: ({ class: Function; tags: string[]; } | IAutoTagger)[] = [];
    // True if service is a named service
    namedService?: boolean = false;
    // Parameter converters
    paramConverters: { type: Function; methodName?: string; paramIndex?: number; converter: IArgumentConverterFunction; }[] = [];
    // INTERNAL: True if Container.$prepareDefinition() called on definition
    $$prepared: boolean = false;

    constructor(service?: Constructor<T>)
    {
        if (service && is.Class(service)) {
            this.name = service.name;
            this.service = service as any;
            this.invoke = false;
            this.namedService = false;
            this.isFactory = isFactory(service);
        }
    }

    /**
     * Add method call in service invokation
     * @param methodName Method name of service
     * @param args Arguments
     * @returns 
     */
    addCall<M extends keyof T>(methodName: M, args: any[]) {
        this.calls[methodName as string] = args;
        return this;
    }

    /**
     * Set constructor parameters
     * @param parameters Parameters
     */
    setConstructorParameters(parameters: any[]) {
        this.parameters = parameters;
        return this;
    }

    /**
     * Set constructor parameter by index
     * @param index Parameter index
     * @param parameter Parameter
     * @returns 
     */
    setConstructorParameter(index: number, parameter: any) {
        this.parameters[index] = parameter;
        return this;
    }

    /**
     * Add tag to service
     * @param tag Tag
     * @returns 
     */
    addTag(...tag: string[]) {
        this.tags.push(...tag);
        return this;
    }

    /**
     * Set method parameters
     * @param method Method name
     * @param args Arguments
     * @returns 
     */
    setMethodParameters(method: keyof T, args: any[]) {
        this.methods[method as string] = args;
        return this;
    }

    /**
     * Add global parameter converter
     * @param type Type
     * @param converter Parameter converter
     */
    addParameterConverter(type: Function, converter: IArgumentConverterFunction): this

    /**
     * Add parameter converter for specific method parameter
     * @param type Type
     * @param methodName Method name
     * @param paramIndex Method parameter index
     * @param converter Parameter converter
     */
    addParameterConverter(type: Function, methodName: string, paramIndex: number, converter: IArgumentConverterFunction): this
    addParameterConverter(type: Function, methodName?: string | IArgumentConverterFunction, paramIndex?: number, converter?: IArgumentConverterFunction)
    {
        if (typeof methodName != 'string') {
            converter = methodName;
            methodName = undefined;
        }

        this.paramConverters.push({ type, methodName, paramIndex, converter: converter! });
        return this;
    }

    /**
     * Set service factory
     * @param factory Factory
     * @returns 
     */
    setFactory(factory: Factory<T>) {
        this.factory = factory;
        return this;
    }
}