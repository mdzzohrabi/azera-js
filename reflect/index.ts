import 'reflect-metadata';
import { attributeDataType, getParamInfo } from './helpers';
import { GetOrCreateMetadata } from './metadata';
import type { AttributeOptions, Attributes, ContextTypes, DecoratorTypes, IAttribute, IAttributeInstance, Kinds, MemberName } from './types';
import { createDecoratorContext } from './context';

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
    Func extends (this: ContextTypes<Kind>, ...args: any[]) => any,
    AttributeValue extends ReturnType<Func>,
    Params extends Parameters<Func>,
    Kind extends Kinds = 'all'
>(
    func: Func,
    options?: AttributeOptions<Kind>
): IAttribute<Params, Kind, AttributeValue>

export function createAttribute<
    Func extends (this: ContextTypes<Kind>, ...args: any[]) => any,
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

            // Decorator context
            const context = createDecoratorContext(...params);

            const paramInfo = getParamInfo(...params);

            if (paramInfo) {
                /** @ts-ignore */
                context.name = paramInfo.name;
            }

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
                type: attributeDataType(context.kind as Kinds, params[0], params[1], params[2]),
                parameterDefaultValue: paramInfo?.defaultValue
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