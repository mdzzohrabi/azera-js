import { HashMap } from "@azera/util/is";
export { HashMap };

// export type 
export type Service = IDefinition | Function | any[];
export type Factory<T = {}> = Constructor<IFactory<T>> | FunctionOf<T>;
export type ContainerValue = any;
export type Constructor<T= {}> = new (...args: any[]) => T;
// export type Constructor<T> = Function & { prototype: T }

export interface IInjectable extends Function { $inject?: string[]; }
export type MockMethod<O extends object, K extends keyof O> = (...params: any[]) => ReturnType< O[K] extends ((...params: any[]) => any) ? O[K] : any >;
export type InjectableFunction<T = any> = { (...params: any[]): T ; $inject?: string[] };
export type FunctionOf<T> = (...params: any[]) => T;
export type Injectable<T = any> = InjectableFunction<T> | Function | Array<string | Function | FunctionOf<T>>;
export type InvokableFunctions<T> = Injectable<T> | Constructor<T> | Factory<T>;
export type Invokable<T> = InvokableFunctions<T> | string | T;
export type IServices = HashMap< IDefinition | Function | any[] >;
export interface IAutoTagger { (service: IDefinition): string[]; }

export type ServiceDefinitionCollection = HashMap<Service>;

export interface IContainer {

    set(values: { [name: string]: IDefinition | ContainerValue }[] ): this;
    set(name: string, value: IDefinition | ContainerValue ): this;

    get <T>(name: string): T | undefined;

    invoke <T>(value: Invokable<T>): T | undefined;

}

export interface IDefinition {
    // Service name
    name: string;
    // Service function or class
    service?: Function;
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
    factory?: Function | IFactory;
    // Service tags
    tags: string[];
    // Invoke service instead of create instance
    invoke: boolean;
    // Imports files or services
    imports: (string | Function)[];
    // Auto tagging definition
    autoTags: ({ class: Function, tags: string[] }|IAutoTagger)[];
}

export interface IInternalDefinition extends IDefinition {
    compiled?: boolean;
    inherited?: boolean;
    $target?: Function;
}

export interface IPropertyInjection {
    lateBinding?: boolean;
    name?: string | Function;
}

export interface IFactory<T = any> {
    create(...params: any[]): T;
}

export interface IMethod {
    context: any;
    method: string;
}