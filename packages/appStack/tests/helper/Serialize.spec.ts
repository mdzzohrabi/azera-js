import { strictEqual } from "assert";
import { expect } from "chai";
import { DeSerialize, Serialize } from "../../src/helper/Serialize";

describe('Serialize', () => {

    it('should serialize string, number, boolean and simple values', () => {
        expect(JSON.stringify("Hello")).equals(Serialize("Hello"));
        expect(JSON.stringify(12)).equals(Serialize(12));
    });

    it('should serialize/deserilize class object', () => {

        class User {
            constructor(public name: string, public age: number) {}

            getName() { return this.name; }
        }

        strictEqual(JSON.stringify(new User('Masoud', 30)), Serialize(new User('Masoud', 30)));
        expect( DeSerialize( Serialize(new User('Masoud', 30)), User ) ).instanceOf(User);

        expect(DeSerialize(JSON.stringify({ name: 'Masoud', age: 12 }), User).getName()).equals("Masoud");

    });

});