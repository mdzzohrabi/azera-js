import type { MetadataIndex, Attributes, MetadataMap, MemberName } from "./types";

const METADATA_KEY = Symbol('metadata');

export function GetMetaKeyAndTarget(target: Function | object, memberName?: MemberName) {
    const metaKey = METADATA_KEY;// memberName ? MEMBERS_META : CLASS_META;
    const metaTarget = (target as any).prototype ?? target;
    return { metaKey, metaTarget };
}

export function GetMetadataIndex(target: Function | object, memberName?: MemberName, parameterIndex?: number): MetadataIndex {
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
export function GetMetadata<M extends MemberName>(target: Function | object, memberName?: M, parameterIndex?: number): Attributes | undefined {
    const metadata = GetMetadataMap(target);

    // No metadata
    if (!metadata)
        return undefined;

    const index = GetMetadataIndex(target, memberName, parameterIndex);

    return metadata.get(index);
}

export function GetMetadataMap(target: Function | object): MetadataMap | undefined {
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
export function InheritMetadataMap(metadata: MetadataMap, parentMetadata: MetadataMap) {
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
export function CreateMetadata(target: Function | object, memberName?: MemberName, parameterIndex?: number): Attributes {
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
export function GetOrCreateMetadata(target: Function | object, memberName?: MemberName, parameterIndex?: number): Attributes {
    return GetMetadata(target, memberName, parameterIndex) ?? CreateMetadata(target, memberName, parameterIndex);
}
