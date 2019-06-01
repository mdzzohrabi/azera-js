import { map } from "../map";
import { deepEqual } from "assert";

describe('Map()', () => {
    it('simple array', () => {
        let result = map([1,2,3], v => v * 2);
        deepEqual(result, [2,4,6]);
    });

    it('object promise', (done) => {
        map({ name: 'Alireza', age: 26 }, async (v) => !!v).then( result => {
            deepEqual(result, [true, true]);
            done();
        });
    });
});