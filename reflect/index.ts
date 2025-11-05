
export type Kinds = 'class' | 'method' | 'property' | 'all';

const CLASS_META = Symbol('classAttributes');
const MEMBERS_META = Symbol('membersAttributes');

type MemberName = symbol | string;
type Attributes = Record<symbol, IAttributeInstance<any, any, any>>

export interface AttributeOptions<Kind extends Kinds> {
    key?: string
    multiple?: boolean
    kind?: Kind
}

export interface ContextTypes {
    class: ClassDecoratorContext
    method: ClassMethodDecoratorContext
    property:
    | ClassGetterDecoratorContext
    | ClassSetterDecoratorContext
    | ClassFieldDecoratorContext
    | ClassAccessorDecoratorContext
    all: DecoratorContext
}

export interface DecoratorTypes {
    class: ClassDecorator
    method: MethodDecorator
    property: PropertyDecorator
    all: ClassDecorator & MethodDecorator & PropertyDecorator
}

export type IAttributeInstance<Params extends any[], Kind extends Kinds, AttributeValue> = {
    attribute: IAttribute<Params, Kind, AttributeValue>
    name: MemberName
    kind: Kinds
    value: AttributeValue
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

/**
 * Get metadata
 * 
 * @param target Class or Class instance
 * @param memberName Member name
 * @returns 
 */
function GetMetadata(target: Function | object, memberName?: MemberName) {
    const metaKey = memberName ? MEMBERS_META : CLASS_META;
    const metaTarget = (target as any).prototype ?? target;
    return Object.getOwnPropertyDescriptor(metaTarget, metaKey)?.value;
}

/**
 * Create metadata
 * 
 * @param target Class or Class instance
 * @param memberName Member name
 * @returns 
 */
function CreateMetadata(target: Function | object, memberName?: MemberName) {
    const metaKey = memberName ? MEMBERS_META : CLASS_META;
    const metaTarget = (target as any).prototype ?? target;
    let metadata = {};
    Object.defineProperty(metaTarget, metaKey, {
        value: metadata = {},
        configurable: false,
        enumerable: false,
        writable: false
    });

    const prototype = Object.getPrototypeOf(metaTarget);

    // Inheritance
    if (prototype !== Object.prototype) {
        const parentMetadata = GetMetadata(prototype, memberName);
        if (parentMetadata) {
            metadata = { ...parentMetadata, metadata };
        }
    }

    return metadata;
}


/**
 * Get or create metadata
 * 
 * @param target Class or class instance
 * @param memberName Member name
 * @returns 
 */
function GetOrCreateMetadata(target: Function | object, memberName?: MemberName) {
    let metadata = GetMetadata(target, memberName) ?? CreateMetadata(target, memberName);

    // Member metadata
    if (memberName) {
        let membersMetadata = metadata as Record<MemberName, Attributes>;
        if (!membersMetadata[memberName])
            membersMetadata[memberName] = {};
        return membersMetadata[memberName];
    }

    return metadata as Attributes;
}

function createDecoratorContext<A extends Function | object, B extends MemberName, C>(target?: A, name?: B, descriptor?: C) {

    let kind: DecoratorKind<A, B, C> = undefined as any;

    const [type1, type2, type3] = [typeof target, typeof name, typeof descriptor];

    if (type1 !== 'object' && type1 !== 'function')
        throw TypeError(`Invalid decorator injection`);

    if (type1 == 'function' || type2 == 'undefined')
        kind = 'class' as DecoratorKind<A, B, C>;
    else if (type3 == 'object')
        kind = 'method' as DecoratorKind<A, B, C>;
    else
        kind = 'property' as DecoratorKind<A, B, C>;

    const metadata = GetOrCreateMetadata(target!, name);

    return {
        kind,
        name,
        metadata
    } as ContextTypes[typeof kind]
}

/**
 * Attribute
 * 
 * @example
 * const Summary = createAttribute(({ summary: string }) => summary, { kind: 'method' });
 * class AuthController {
 *      \@Summary('Login') login () {}
 * }
 * 
 * @param func Attribute inputs and output generator
 * @param options Attribute options
 * @returns 
 */
export function createAttribute<
    Func extends (...args: [...any, string]) => any,
    AttributeValue extends ReturnType<Func>,
    Params extends Parameters<Func>,
    Kind extends Kinds = 'all'
>(
    func: Func,
    options?: AttributeOptions<Kind>
): IAttribute<Params, Kind, AttributeValue> {

    const {
        kind = 'all',
        key,
        multiple = false
    } = options ?? {}

    const attrKey = Symbol(key ?? func.name);

    const attribute = (...args: Params) => {
        const attributeValue = func(...args);

        // actual decorator
        const decorator: DecoratorTypes[Kind] = (...params: any[]) => {
            const { kind, metadata, name } = createDecoratorContext(...params);
            metadata[attrKey] = {
                value: attributeValue,
                attribute,
                kind,
                name
            } as IAttributeInstance<Params, Kind, AttributeValue>;
        }

        return decorator;
    };

    attribute.attrKey = attrKey;
    attribute.attrOptions = Object.assign({}, { kind, key, multiple }, options);

    return attribute;
}

export function getAttributes(target: Function | object, memberName?: MemberName): Record<symbol, IAttributeInstance<any, any, any>> {
    return GetOrCreateMetadata(target, memberName);
}

export function getAttribute<Params extends any[], Kind extends Kinds, AttributeValue>(attribute: IAttribute<Params, Kind, AttributeValue>, target: Function | object, memberName?: MemberName): IAttributeInstance<Params, Kind, AttributeValue> | undefined {
    let metadata = GetOrCreateMetadata(target, memberName);
    let result = metadata[attribute.attrKey];
    return result;
}

export function hasAttribute<Params extends any[], Kind extends Kinds, AttributeValue>(attribute: IAttribute<Params, Kind, AttributeValue>, target: Function | object, memberName?: MemberName): boolean {
    const attributes = getAttributes(target, memberName);
    return attribute.attrKey in attributes;
}