import { deepStrictEqual, doesNotThrow, notStrictEqual, strictEqual, throws } from "assert";
import { dirname, resolve } from "path";
import { asyncEach, debugName, deepClone, flatObject, getPackageDir, getProperty, invariant, serialize, setProperty, wait } from "../src";

describe('Util', () => {

    it('getPackageDir', () => {
        let nodeModulesDir = resolve(dirname(__dirname), 'node_modules');
        strictEqual(getPackageDir('typescript'), resolve(nodeModulesDir, 'typescript'));
    });

    it('asyncEach', async () => {
        let source: number[] = [1, 2, 3];
        let result: number[] = [];
        await asyncEach(source, async n => {
            result.push(n);
        });

        deepStrictEqual(result, source);
    });

    it('serialize', async () => {
        let result: number[] = [];
        await serialize([
            async () => { await wait(5); result.push(1) },
            async () => result.push(2)
        ]);
        deepStrictEqual(result, [1, 2]);
    });

    it('setProperty', () => {
        let object = {
            name: 'Masoud',
            livingLocation: { city: 'Abadan', country: 'Iran' }
        };

        setProperty(object, 'livingLocation.city', 'Ahvaz');
        strictEqual(object.livingLocation.city, 'Ahvaz');
        setProperty(object, 'name', 'Alireza');
        strictEqual(object.name, 'Alireza');

        deepStrictEqual(object, {
            name: 'Alireza',
            livingLocation: { city: 'Ahvaz', country: 'Iran' }
        })
    });

    it('getProperty', () => {
        let object = {
            name: 'Masoud',
            livingLocation: { city: 'Abadan', country: 'Iran' }
        };

        strictEqual(getProperty(object, 'livingLocation.city'), 'Abadan');
        strictEqual(getProperty(object, 'name'), 'Masoud');
    });

    it('invariant', () => {
        let n = 2;
        throws(() => {
            invariant(n == 3, 'n must not equals to 3');
        }, /n must not equals to 3/);

        doesNotThrow(() => {
            invariant(2 == 2, 'It\'s ok');
        });
    });

    it('debugName', () => {
        strictEqual(debugName('Hello'), 'String("Hello")');
        strictEqual(debugName(12), 'Number(12)');
        strictEqual(debugName(function A() {}), 'A');
        strictEqual(debugName(class B {}), 'B');
    });

    it('flatObject', () => {
        deepStrictEqual(
            flatObject({
                http: { port: 9090 },
                routes: [
                    { controller: 'MainController' }
                ]
            }),
            {
                'http.port': 9090,
                'routes.0.controller': 'MainController'
            }
        )
    });

    it('deepClone', () => {
        let a = { http: { port: 9090 } };
        let b = deepClone(a);
        deepStrictEqual(a, b);
        notStrictEqual(a, b);
    });


})