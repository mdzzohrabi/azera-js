export interface ISerializable {

    serialize(): any

    unserialize(data: any): void

}

export class Serializer {

    static serialize(data: any): any {
        let result = undefined;
        if ( typeof data == 'object' && 'serialize' in data ) {
            result = data.serialize();
        } else {
            result = JSON.stringify(data, (key, value) => {
                return this.serialize(value);
            });
        }

        return result;
    }

}