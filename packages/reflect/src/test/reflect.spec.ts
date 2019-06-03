import { deepEqual, equal, ok } from "assert";
import { getParameters, isArrowFunction, isCallable, isClass, isFunction, isMethod, reflect } from "../index";

describe('isArrowFunction()', () => {

    class Console {
        static print() { }
    }

    it('should works ok', () => {
        ok(isArrowFunction( () => null ));
        ok(isArrowFunction( (name: number = 12) => {}));
        ok(isArrowFunction( ({ name }: { name: string }) => null ));
        equal( isArrowFunction(function () {}), false );
        equal( isArrowFunction(Console.print), false, `Class methods are not arrow functions`);
    })

});

describe('isMethod()', () => {

    class Console {
        static print() { }
    }

    it('should works ok', () => {
        ok( !isMethod( () => null ));
        ok( !isMethod( (name: number = 12) => {}));
        ok( !isMethod( ({ name }: {name: string}) => null ));
        ok( !isMethod(function () {}) );
        ok( isMethod(Console.print) );
    })

})

describe('getParameters()', () => {
    it('should resolve function parameters', () => {
        deepEqual(
            getParameters(function (param1: any, param2: any) { }),
            ['param1', 'param2']
        );

        deepEqual( getParameters( function (arg1: any) {}), [ 'arg1' ] );
        deepEqual( getParameters( (arg1: any) => {}), [ 'arg1' ] );

        class A {
            m ( n = 12 ) {}
        }

        let a = new A;

        ok( !isArrowFunction(a.m) );
        deepEqual( getParameters(a.m), [ 'n' ] );
    });

    it('should resolve class with mixin parameters', () => {

        function Mixin(target: any) {
            return class extends target {

            }
        }

        class M extends Mixin(class {}) {

        }
        deepEqual( getParameters(M), []);

    });

    it('should resolve class constructor parameters', () => {
        deepEqual(
            getParameters(class {
                constructor(param1: any, param2: any) { }
            }),
            ['param1', 'param2']
        );
    });


    it('should resolve async function parameters', () => {
        deepEqual(
            getParameters(async (logger: any) => {}),
            [ 'logger' ]
        );

        deepEqual(
            getParameters(async function (logger: any) {}),
            [ 'logger' ]
        );
    });

    it('should resolve arrow function parameters', () => {
        deepEqual(getParameters((param1: any, param2: any) => null), ['param1', 'param2']);
        deepEqual(getParameters((param1: any) => null), ['param1']);
    });

    it('should resolve empty parameters', () => {
        deepEqual(getParameters(function () { }), []);
        deepEqual(getParameters(class { }), []);
        deepEqual(getParameters(() => null), []);
    });

    it('should resolve object destruct parameters', () => {
        deepEqual( getParameters(function ({ name, age = 12 }: { name: string, age: number }) {

        }) , [ 'p0' ])
    })
});

describe('Type checking', async () => {

    it('isArrowFunction()', () => {
        ok(isArrowFunction(() => null));
        ok(isArrowFunction((_: any) => null));
        ok(!isArrowFunction(async function () { }));
        ok(!isArrowFunction(function () { }));
        ok(!isArrowFunction(class { }));
    });

    it('isClass()', () => {
        ok(isClass(class { }));
        ok(!isClass(function () { }));
        ok(!isClass(() => null));
    });

    it('isFunction()', () => {
        ok(isFunction(() => null));
        ok(isFunction(class { }));
    });

    it('isFunction()', () => {
        ok(isCallable(() => null));
        ok(!isCallable(class { }), 'Classes are not callable');
    });
});

describe('Reflect', () => {
    it('anonymous function with parameters', () => {
        let r = reflect(function (a: any, b: any, c: any) { });
        equal('', r.name); // Name
        ok(r.isFunction);  // Function
        ok(!r.isClass);    // Class
        ok(r.isAnonymous); // Anonymous
        // Parameters
        equal(r.parameters.length, 3);
        deepEqual(r.parameters, ['a', 'b', 'c']);
    });

    it('named function without parameters', () => {
        let ref = reflect(function TestFn() { });
        equal(ref.name, 'TestFn');
        deepEqual(ref.parameters, []);
        equal(ref.isFunction, true);
        equal(ref.isClass, false);
        equal(ref.isAnonymous, false);
    });


    it('class', () => {
        let ref = reflect(class Console {
            constructor(version: any) {}
        });
        ok(ref.isClass);
    })

});