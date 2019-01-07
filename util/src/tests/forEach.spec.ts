import { forEach } from "../forEach";
import { deepEqual, equal } from "assert";

describe(`forEach`, () => {
    it(`should works with array`, () => {
        let result: any[] = [];
        let array = [1,2,3,4,5];
        forEach(array, (value, index) => {
            result[index] = value;
        });
        deepEqual(result, array);
    });

    it(`should works with objects`, () => {

        let base = { name: 'Masoud' };
        let dest: {[k: string]: any} = {};

        forEach(base, (value, name) => {
            dest[name] = value;
        });

        equal(dest['name'], base.name);

    });
});