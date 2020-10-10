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

    it('should resolve commented parameters', () => {

        deepEqual(
            getParameters(class {
                constructor(/** parameter 1 */ param1: any, param2: any) { }
            }),
            ['param1', 'param2']
        );

        deepEqual(
            getParameters(class {
                constructor(
                    /** parameter 1 */ param1: any,
                    // Parameter 2
                    param2: any,        // ASD
                    param3: number
                ) { }
            }),
            ['param1', 'param2', 'param3']
        );

    })

    it('should resolve parameters with default values', () => {

        deepEqual(
            getParameters(class {
                constructor(/** parameter 1 */ param1: any, param2: any = 12) { }
            }, false),
            [
                { name: 'param1', hasDefault: false, value: undefined },
                { name: 'param2', hasDefault: true, value: '12' }
            ]
        );

    });

    
    it('should resolve async class method parameters with three parameter and default value', () => {

        class Controller {
            async categoryExposAction(categories: any, expos: any, limit = 10, start = 10, categoryId: number) {
                {} {}
            }            
        }

        let controller = new Controller;

        deepEqual(
            getParameters(controller['categoryExposAction']),
            [ 'categories', 'expos', 'limit', 'start', 'categoryId' ]
        );
    });
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

    it('should reflect async function correctly (one parameter)', () => {
        let result = reflect(async function HelloWorld(param1: string) {});

        equal(result.name, 'HelloWorld');
        equal(result.parameters.length, 1);
        deepEqual(result.parameters, ['param1']);
        ok(result.isAsync);

    });

    it('should reflect async function correctly (three parameter with default)', () => {
        let result = reflect(async function HelloWorld(param1: string, param2: number = 10, param3: boolean) {

        });

        equal(result.name, 'HelloWorld');
        equal(result.parameters.length, 3);
        deepEqual(result.parameters, ['param1', 'param2', 'param3']);
        ok(result.isAsync);
    });

});