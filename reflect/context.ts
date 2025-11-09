import { GetDecoratorKind } from "./helpers";
import { GetOrCreateMetadata } from "./metadata";
import type { ContextTypes, DecoratorKind, MemberName } from "./types";

/**
 * Get decorator context
 * 
 * @returns Decorator context
 */
export function createDecoratorContext<A extends Function | object, B extends MemberName, C>(target?: A, name?: B, descriptor?: C)
{
    let kind: DecoratorKind<A, B, C> = GetDecoratorKind(target, name, descriptor);

    const metadata = GetOrCreateMetadata(target!, name, typeof descriptor == 'number' ? descriptor as number : undefined);

    return {
        kind,
        name: name ?? (target as Function)?.name,
        metadata,
    } as ContextTypes<typeof kind>
}