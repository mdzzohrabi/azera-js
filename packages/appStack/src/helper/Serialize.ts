import { Constructor, is } from "@azera/util";

/**
 * Serializable object interface
 */
export interface ISerializable<T> {
    serialize(): string
    unserialize(value: any): T
}

export function isISerializable<T>(value: any): value is ISerializable<T> {
    if (typeof value == 'object' || typeof value == 'function') {
        return 'serialize' in value && 'unserialize' in value;
    }
    return false;
}

/**
 * Serialize a value to string
 * @param value Value to serialize
 * @returns
 */
export function Serialize(value: any): string {
    if (isISerializable(value)) {
        return value.serialize();
    } else {
        return JSON.stringify(value);
    }
}

/**
 * DeSerialize a value from string
 * @param value Serialized value
 * @returns 
 */
export function UnSerialize<T>(value: any, type?: Constructor<T> | object): T {
    if (!type) return JSON.parse(value);
    if (isISerializable(type)) return type.unserialize(value) as T;
    let object: any = is.Class(type) ? new type() : type;

    let parsed = is.String(value) ? JSON.parse(value) : value;
    let ownedProperties = Object.getOwnPropertyNames(object);
    
    for (let key of Object.keys(parsed)) {
        if (ownedProperties.includes(key)) {
            object[key] = parsed[key];
        }
    }

    return object as any;
}