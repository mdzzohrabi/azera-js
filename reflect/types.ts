
export type Kinds = keyof NativeContextTypes;

export type MetadataIndex = string;
export type MetadataMap = Map<MetadataIndex, Attributes>;
export type MemberName = symbol | string;
export type Attributes = Record<symbol, IAttributeInstance<any, any, any>>

export interface AttributeOptions<Kind extends Kinds> {
    key?: string
    multiple?: boolean
    kind?: Kind
}

export type AttributeFuncThis<Params extends any[], Kind extends Kinds, AttributeValue> = {
    instance: Omit<IAttributeInstance<Params, Kind, AttributeValue>, 'value'>
} & ContextTypes<Kind>

export interface NativeContextTypes {
    class: ClassDecoratorContext
    method: ClassMethodDecoratorContext
    parameter: DecoratorContext
    property:
    | ClassGetterDecoratorContext
    | ClassSetterDecoratorContext
    | ClassFieldDecoratorContext
    | ClassAccessorDecoratorContext
    all: DecoratorContext
}

export type ContextTypes<T extends keyof NativeContextTypes> = NativeContextTypes[T];

export interface DecoratorTypes {
    class: ClassDecorator
    method: MethodDecorator
    property: PropertyDecorator
    parameter: ParameterDecorator
    all: ClassDecorator & MethodDecorator & PropertyDecorator & ParameterDecorator
}

export type IAttributeInstance<Params extends any[] = any, Kind extends Kinds = any, AttributeValue = any> = {
    attribute: IAttribute<Params, Kind, AttributeValue>
    name: MemberName
    parameterIndex?: number
    kind: Kinds
    value: AttributeValue
    inherited: boolean
    target: Function | object
    parameterDefaultValue?: string
    type?: any
    constructorTypes?: any[]
}

export type IAttribute<Params extends any[], Kind extends Kinds, AttributeValue> = {
    (...params: Params): DecoratorTypes[Kind]
    attrKey: symbol
    attrOptions: AttributeOptions<Kind>
}

export type DecoratorKind<A, B, C> =
    A extends Function
    ? 'class'
    : A extends object
    ? B extends MemberName
    ? C extends undefined
    ? 'property'
    : 'method'
    : 'all'
    : 'all';

