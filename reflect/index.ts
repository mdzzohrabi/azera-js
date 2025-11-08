import 'reflect-metadata';

export type Kinds = 'class' | 'method' | 'property' | 'parameter' | 'all';

const METADATA_KEY = Symbol('metadata');

type MetadataIndex = string;
type MetadataMap = Map<MetadataIndex, Attributes>;

// export interface Metadata {
//     classAttributes: Attributes
//     membersAttributes: Record<MemberName, Attributes>
//     parametersAttributes: Record<MemberName, Record<number, Attributes>>
// }

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
    parameter: DecoratorContext
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
    parameter: ParameterDecorator
    all: ClassDecorator & MethodDecorator & PropertyDecorator & ParameterDecorator
}

export type IAttributeInstance<Params extends any[], Kind extends Kinds, AttributeValue> = {
    attribute: IAttribute<Params, Kind, AttributeValue>
    name: MemberName
    parameterIndex?: number
    kind: Kinds
    value: AttributeValue
    inherited: boolean
    target: Function | object
    type?: any
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

function GetMetaKeyAndTarget(target: Function | object, memberName?: MemberName) {
    const metaKey = METADATA_KEY;// memberName ? MEMBERS_META : CLASS_META;
    const metaTarget = (target as any).prototype ?? target;
    return { metaKey, metaTarget };
}

function GetMetadataIndex(target: Function | object, memberName?: MemberName, parameterIndex?: number): MetadataIndex {
    if (!memberName && parameterIndex === undefined)
        return 'class';

    return `${String(memberName ?? 'constructor')}${parameterIndex !== undefined ? `$${parameterIndex}` : ``}`;
}

/**
 * Get metadata
 * 
 * @param target Class or Class instance
 * @param memberName Member name
 * @returns 
 */
function GetMetadata<M extends MemberName>(target: Function | object, memberName?: M, parameterIndex?: number): Attributes | undefined {
    const metadata = GetMetadataMap(target);

    // No metadata
    if (!metadata)
        return undefined;

    const index = GetMetadataIndex(target, memberName, parameterIndex);

    return metadata.get(index);
}

function GetMetadataMap(target: Function | object): MetadataMap | undefined {
    const { metaKey, metaTarget } = GetMetaKeyAndTarget(target);
    const metadata: MetadataMap = Object.getOwnPropertyDescriptor(metaTarget, metaKey)?.value;

    // No metadata
    if (!metadata)
        return undefined;

    return metadata;
}

/**
 * Inherit metadata from parent
 * @param metadata Target metadata
 * @param parentMetadata Parent metadata
 */
function InheritMetadataMap(metadata: MetadataMap, parentMetadata: MetadataMap) {
    parentMetadata.forEach((attributes, index) => {
        // Inherit attributes
        let inheritedAttributes = Object.fromEntries(Object.getOwnPropertySymbols(attributes).map(key => [key, Object.assign({}, attributes[key], { inherited: true })]));

        if (!metadata.has(index)) {
            metadata.set(index, inheritedAttributes);
        }
        else {
            const existing = metadata.get(index)!;
            metadata.set(index, {
                ...existing,
                ...inheritedAttributes
            });
        }
    });
}

/**
 * Create metadata
 * 
 * @param target Class or Class instance
 * @param memberName Member name
 * @returns 
 */
function CreateMetadata(target: Function | object, memberName?: MemberName, parameterIndex?: number): Attributes {
    const { metaKey, metaTarget } = GetMetaKeyAndTarget(target, memberName);

    let metadata = GetMetadataMap(target);

    if (!metadata) {
        metadata = new Map<MetadataIndex, Attributes>();
        // Define metadata
        Object.defineProperty(metaTarget, metaKey, {
            value: metadata,
            configurable: false,
            enumerable: false,
            writable: false,
        });
    }

    // Get prototype
    const prototype = Object.getPrototypeOf(metaTarget);

    // Inheritance
    if (prototype !== Object.prototype) {
        const parentMetadata = GetMetadataMap(prototype); // Raw metadata from parent
        if (parentMetadata) {
            InheritMetadataMap(metadata, parentMetadata);
        }
    }

    const index = GetMetadataIndex(target, memberName, parameterIndex);

    // Create metadata entry
    if (!metadata.has(index))
        metadata.set(index, {});

    return metadata.get(index)!;
}


/**
 * Get or create metadata
 * 
 * @param target Class or class instance
 * @param memberName Member name
 * @returns 
 */
function GetOrCreateMetadata(target: Function | object, memberName?: MemberName, parameterIndex?: number): Attributes {
    return GetMetadata(target, memberName, parameterIndex) ?? CreateMetadata(target, memberName, parameterIndex);
}

/**
 * Get decorator kind
 */
function GetDecoratorKind<A extends Function | object, B extends MemberName, C>(target?: A, name?: B, descriptor?: C): DecoratorKind<A, B, C> {

    let kind: DecoratorKind<A, B, C> = undefined as any;

    const [type1, type2, type3] = [typeof target, typeof name, typeof descriptor];

    if (type1 !== 'object' && type1 !== 'function')
        throw TypeError(`Invalid decorator injection`);

    // Class
    if (type1 == 'function' && type2 == 'undefined' && type3 == 'undefined')
        kind = 'class' as DecoratorKind<A, B, C>;

    // Method
    else if (type3 == 'object')
        kind = 'method' as DecoratorKind<A, B, C>;

    // Parameter
    else if (type3 == 'number')
        kind = 'parameter' as DecoratorKind<A, B, C>;

    // Property
    else
        kind = 'property' as DecoratorKind<A, B, C>;

    if (!kind)
        throw TypeError(`Cannot detect decorator kind for ${target}${name ? '.' + String(name) : ''}`);

    return kind;
}

/**
 * Get decorator context
 * @returns Decorator context
 */
function createDecoratorContext<A extends Function | object, B extends MemberName, C>(target?: A, name?: B, descriptor?: C) {

    let kind: DecoratorKind<A, B, C> = GetDecoratorKind(target, name, descriptor);

    const metadata = GetOrCreateMetadata(target!, name, typeof descriptor == 'number' ? descriptor as number : undefined);

    return {
        kind,
        name: name ?? (target as Function)?.name,
        metadata
    } as ContextTypes[typeof kind]
}

function attributeDataType(kind: Kinds, target: any, propName?: any, paramIndex?: number) {
    if (kind == 'parameter') {
        const types = Reflect.getMetadata('reflect:paramtypes', target, propName);
        console.log({ types });
    }    
}

/**
 * Attribute
 * 
 * @example
 * const Summary = createAttribute(({ summary: string }) => summary, { kind: 'method' });
 * class AuthController {
 *      @Summary('Login') login () {}
 * }
 * 
 * @param func Attribute inputs and output generator
 * @param options Attribute options
 * @returns 
 */
export function createAttribute<
    AttributeValue = true,
    Params extends any[] = any[],
    Kind extends Kinds = 'all'
>(
    options?: AttributeOptions<Kind>
): IAttribute<Params, Kind, AttributeValue>

export function createAttribute<
    Func extends (this: ContextTypes[Kind], ...args: any[]) => any,
    AttributeValue extends ReturnType<Func>,
    Params extends Parameters<Func>,
    Kind extends Kinds = 'all'
>(
    func: Func,
    options?: AttributeOptions<Kind>
): IAttribute<Params, Kind, AttributeValue>

export function createAttribute<
    Func extends (this: ContextTypes[Kind], ...args: any[]) => any,
    AttributeValue extends ReturnType<Func>,
    Params extends Parameters<Func>,
    Kind extends Kinds = 'all'
>(
    func: Func,
    options?: AttributeOptions<Kind>
): IAttribute<Params, Kind, AttributeValue> {

    if (typeof func !== 'function') {
        options = func as AttributeOptions<Kind>;
        func = function () { return true; } as Func;
    }

    const {
        kind = 'all',
        key,
        multiple = false
    } = options ?? {}

    const attrKey = Symbol(key ?? func.name);

    // Attribute decorator
    const attribute = (...args: Params) => {

        // Actual decorator
        const decorator: DecoratorTypes[Kind] = (...params: any[]) => {
            // console.log(params);
            // Decorator context
            const context = createDecoratorContext(...params);

            // Ensure attribute can be applied to this kind
            if (kind !== 'all' && context.kind !== kind) {
                throw TypeError(`Attribute '${String(key ?? func.name)}' cannot be applied to ${context.kind} kind`);
            }

            // Invoke attribute
            const attributeValue = func.call(context as any, ...args);

            context.metadata[attrKey] = {
                value: attributeValue,
                attribute,
                kind: context.kind,
                name: context.name,
                parameterIndex: typeof params[2] == 'number' ? params[2] as number : undefined,
                inherited: false,
                target: params[0],
                type: attributeDataType(context.kind as Kinds, params[0], params[1], params[2])
            } as IAttributeInstance<Params, Kind, AttributeValue>;
        }

        return decorator;
    };

    attribute.attrKey = attrKey;
    attribute.attrOptions = Object.assign({}, { kind, key, multiple }, options);

    return attribute;
}

export function getAttributes(target: Function | object, memberName?: MemberName, parameterIndex?: number): Attributes {
    return GetOrCreateMetadata(target, memberName, parameterIndex) ?? {};
}

/**
 * Get specific attribute for class or its member
 * 
 * @param attribute Attribute
 * @param target Class
 * @param memberName Member name
 * @returns 
 */
export function getAttribute<Params extends any[], Kind extends Kinds, AttributeValue>(attribute: IAttribute<Params, Kind, AttributeValue>, target: Function | object, memberName?: MemberName, parameterIndex?: number): IAttributeInstance<Params, Kind, AttributeValue> | undefined {
    let metadata = getAttributes(target, memberName, parameterIndex);
    if (!metadata) return undefined;
    let result = metadata[attribute.attrKey];
    return result;
}

/**
 * Check if a class or its member has specific attribute
 * 
 * @param attribute Attribute
 * @param target Class
 * @param memberName Member name
 * @returns 
 */
export function hasAttribute<Params extends any[], Kind extends Kinds, AttributeValue>(attribute: IAttribute<Params, Kind, AttributeValue>, target: Function | object, memberName?: MemberName, parameterIndex?: number): boolean {
    const attributes = getAttributes(target, memberName, parameterIndex);
    return attribute.attrKey in attributes;
}

export const __Test = {
    GetMetadataMap
}