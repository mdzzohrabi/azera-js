import { ok, fail } from "assert";
import is from "../is";
import support from '../support';

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

    it('HashMap()', () => {
        ok(is.HashMap({}));
        ok(!is.HashMap([]));
    });

    if ( support.class ) {
        it('Class()', () => {
            ok(is.Class(eval(`let t = class {}; t`)));
            ok(!is.Class(eval(`new class {}`)));
            ok(!is.Class(function () {}));
            ok(!is.Class(23));
            ok(!is.Class(eval(`() => null`)));
        });
    } else {
        xit(`Class() [Environment doesn't support class]`);
    }

    it('ClassObject()', () => {

        ok(is.ClassObject(new class {}));
        ok(is.ClassObject(new function() {}));
        ok(!is.ClassObject(function() {}));
        ok(!is.ClassObject(class {}));

    });


    it('Empty()', () => {
        ok(is.Empty(null));
        ok(is.Empty([]));
        ok(is.Empty({}));
        ok(is.Empty(false));
        ok(is.Empty(undefined));
        ok(is.Empty(0));
        ok(is.Empty(""));
        
        ok(!is.Empty("hello"));
        ok(!is.Empty({ a: 12 }));
        ok(!is.Empty([ 1, 2 ]));
    });

});