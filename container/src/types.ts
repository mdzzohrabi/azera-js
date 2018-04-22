import { HashMap } from "@azera/util/is";
export { HashMap };

// export type 
export type Service = IDefinition | Function | any[];
export type Factory<T = {}> = Constructor<IFactory<T>> | FunctionOf<T>;
export type ContainerValue = any;
export type Constructor<T= {}> = new (...args) => T;
// export type Constructor<T> = Function & { prototype: T }

export interface IInjectable extends Function { $inject?: string[]; }
export type MockMethod<O extends object, K extends keyof O> = (...params) => ReturnType< O[K] extends ((...params) => any) ? O[K] : any >;
export type InjectableFunction<T = any> = { (...params): T ; $inject?: string[] };
export type FunctionOf<T> = (...params) => T;
export type Injectable<T = any> = InjectableFunction<T> | Function | Array<string | FunctionOf<T>>;
export type InvokableFunctions<T> = Injectable<T> | Constructor<T> | Factory<T>;
export type Invokable<T> = InvokableFunctions<T> | string | T;
export type IServices = HashMap< IDefinition | Function | any[] >;
export interface IAutoTagger { (service: IDefinition): string[]; }

export type ServiceDefinitionCollection = HashMap<Service>;

export interface IContainer {

    set(values: { [name: string]: ContainerValue }[] ): this;
    set(name: string, value: ContainerValue): this;

    get <T>(name: string): T;

    invoke <T>(value: Invokable<T>): T;

}

export interface IDefinition {
    name?: string;
    service?: Function;
    parameters?: string[];
    properties?: HashMap<string | Function | IPropertyInjection>;
    private?: boolean;
    isFactory?: boolean;
    factory?: Function | IFactory;
    tags?: string[];
    invoke?: boolean;
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
    create(...params): T;
}

export interface IMethod {
    context: object;
    method: string;
}