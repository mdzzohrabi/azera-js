import { HashMap } from "@azera/util/is";
import type { Container } from "./container";
export { HashMap };

// export type 
export type ServiceType = ServiceDefinition | Function | any[];
export type Factory<T = {}> = Constructor<IFactory<T>> | FunctionOf<T>;
export type ContainerValue = any;
export type Constructor<T= {}> = new (...args: any[]) => T;
// export type Constructor<T> = Function & { prototype: T }

export interface IInjectable extends Function { $inject?: string[]; }
export type MockMethod<O extends object, K extends keyof O> = (...params: any[]) => ReturnType< O[K] extends ((...params: any[]) => any) ? O[K] : any >;
export type MockMethodAsync<O extends object, K extends keyof O> = (...params: any[]) => Promise< ReturnType< O[K] extends ((...params: any[]) => any) ? O[K] : any > >;
export type InjectableFunction<T = any> = { (...params: any[]): T ; $inject?: string[] };
export type FunctionOf<T> = (...params: any[]) => T;
export type Injectable<T = any> = InjectableFunction<T> | Function | Array<string | Function | FunctionOf<T>>;
export type InvokableFunctions<T> = Injectable<T> | Constructor<T> | Factory<T>;
export type Invokable<T> = InvokableFunctions<T> | string | T;
export type IServices = HashMap< ServiceDefinition | Function | any[] >;
export interface IAutoTagger { (service: ServiceDefinition): string[]; }

export type ServiceDefinitionCollection = HashMap<ServiceType>;

export interface ServiceDefinition<T = Function> {
    // Service name
    name: string;
    // Service function or class
    service?: T;
    // Constructor parameters
    parameters: ( string | Function )[];
    // Function/Class properties
    properties: HashMap<string | Function | IPropertyInjection>;
    // Methods injections
    methods: { [name: string]: (string|Function)[] };
    // Call methods
    calls: { [name: string]: (string|Function)[] };
    // Private service flag
    private: boolean;
    // Service is factory instead of orginal service
    isFactory: boolean;
    // Factory function
    factory?: Factory;
    // Service tags
    tags: string[];
    // Invoke service instead of create instance
    invoke: boolean;
    // Imports files or services
    imports: (string | Function)[];
    // Auto tagging definition
    autoTags: ({ class: Function, tags: string[] }|IAutoTagger)[];
    // True if service is a named service
    namedService?: boolean;
    // Parameter converters
    paramConverters?: { type: Function, methodName?: string, paramIndex?: number , converter: IArgumentConverterFunction }[];
    // true if $prepareDefinition called on definition
    $$prepared?: boolean
}

export interface IInternalDefinition extends ServiceDefinition {
    compiled?: boolean;
    inherited?: boolean;
    $target?: Function;
}

export interface IPropertyInjection {
    lateBinding?: boolean;
    name?: string | Function;
}

export interface IFactoryCondition {
    target?: Function;
    methodName?: string;
    paramIndex?: number;
}

export interface IFactory<T = any> {
    create(...params: any[]): T;
    factoryCondition?: IFactoryCondition;
    isPrivateFactory?: boolean;
}

export interface IMethod {
    context: any;
    method: string;
}

export interface ArgumentConverterOptions {
    type: Function
    value: any
    target: any
    method: string
    parameterName: string
    parameterIndex: number
    parameters: any[]
    container: Container
}

export interface IArgumentConverterFunction<T = any> { (value: ArgumentConverterOptions, container: Container): T }

export interface IContainerInvokeOptions<Async=boolean> {
    context?: any;
    override?: Partial<ServiceDefinition>;
    async?: Async;
    invokeArguments?: any[];
    argumentIndex?: number;
    private?: boolean;
    methodName?: string;
    methodTarget?: any;
    stack: any[];
}

export class IContainerInvokeOptions<Async=boolean> {}
export class ContainerInvokeOptions extends IContainerInvokeOptions {}