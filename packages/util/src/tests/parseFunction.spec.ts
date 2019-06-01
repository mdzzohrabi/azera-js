import { parseFunction } from "../function";
import { equal, deepEqual } from "assert";

describe('parseFunction()', () => {
    it('should works', () => {
        let result = parseFunction(function Add(a: any,b: any) {});
        equal(result.name, 'Add');
        equal(result.isArrow, false);
        equal(result.isAnonymous, false);
        equal(result.isAsync, false);
        deepEqual(result.params, ['a', 'b']);

        let func = async () => null;

        let ES5 =  func.toString().indexOf("async") < 0;

        if ( !ES5 ) {
            result = parseFunction(func);
            equal(result.isArrow, true);
            equal(result.isAsync, true);
        }


        result = parseFunction((name = 'Masoud') => null, { parseDefaults: true });
        deepEqual(result.params, ['name']);
        if ( !ES5 ) equal(result.defaults['name'], 'Masoud');
    });
})