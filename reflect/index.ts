export type Kinds = 'class' | 'method' | 'property' | 'all';

export interface AttributeOptions<Kind extends Kinds> {
    key?: string
    multiple?: boolean
    kind: Kind
}

export interface ContextTypes {
    class: ClassDecoratorContext
    method: ClassMethodDecoratorContext
    property: ClassGetterDecoratorContext
    | ClassSetterDecoratorContext
    | ClassFieldDecoratorContext
    | ClassAccessorDecoratorContext
    all: DecoratorContext
}

export function createAttribute<
    Func extends (...args: any) => any,
    Attribute extends ReturnType<Func>,
    Params extends Parameters<Func>,
    Target extends Kinds
>(
    func: Func,
    options?: AttributeOptions<Target>
) {

    const {
        kind = 'all',
        key,
        multiple = false
    } = options ?? {}

    const attrKey = Symbol(key ?? func.name);

    return (...args: Params) => {
        const attribute = func(...args);

        // actual decorator
        return (target: any, context: ContextTypes[Target]) => {
            console.log('Context', context);
            // context.metadata[attrKey] = attribute;
        }
    }

}

export function getAttributes(target: any) {
    console.log(target['metadata']);
}