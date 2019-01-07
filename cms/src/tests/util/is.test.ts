import { ok, fail } from "assert";
import { is } from "../../util/is";

describe(`Is`, () => {

    it('String()', () => {
        ok(is.String('Hello'));
        ok(is.String(`Masoud`));
        ok(!is.String(2));
    });

    it('InstanceOf()', () => {
        class A {}
        class B extends A {}
        ok(is.InstanceOf(new B, A));
        ok(is.InstanceOf(/[A-Z]/, RegExp));
        ok(!is.InstanceOf(12, RegExp));
    });

    it('RegExp()', () => {
        ok(/12/ instanceof RegExp);
        ok(is.RegExp(/12/));
    });

    it('ArrayOf()', () => {
        ok(is.ArrayOf<string>(['A','B','C'], is.String));
        ok(!is.ArrayOf<string>(['A',2,'C'], is.String));
        ok(!is.ArrayOf<string>([1,2,3], is.String));
    });

});