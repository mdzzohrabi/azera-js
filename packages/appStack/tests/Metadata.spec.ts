import { createMetaDecorator, createDecorator, hasMeta, getMeta, getClassDecoratedProps } from "../src";
import { ok, equal } from 'assert';

describe('MetaData', () => {

    it('should works fine', () => {

        let Required = createMetaDecorator<boolean, false>('required', false);
        let Before = createDecorator((fn: Function) => fn, 'before', true);
        let After = createDecorator((fn: Function) => fn, 'after', true);

        class Animal {

            @Required(true)
            @Before(() => console.log('Name'))
            name!: string;

        }

        ok(hasMeta(Required, Animal, 'name'));
        ok(hasMeta(Before, Animal, 'name'));
        ok(!hasMeta(After, Animal, 'name'));

        let isRequired = getMeta(Required, Animal, 'name');
        let befores = getMeta(Before, Animal, 'name');

        equal(isRequired, true);
        equal(befores?.length, 1);
        ok(befores![0] instanceof Function, `Before decorator must be instance of Functions`);

        class Elephant extends Animal {};

        ok(hasMeta(Required, Elephant, 'name'), `Elephant should inherit decorators from parent`);
        ok(getClassDecoratedProps(Elephant).has('name'));

    });

});