import { createMetaDecorator, createDecorator, hasMeta, getMeta, getClassDecoratedProps, getTarget } from "../src";
import { ok, equal, notEqual } from 'assert';

describe('Metadata', () => {

    it('getTarget() should works fine', () => {
        class Animal {}
        class Elephant extends Animal {}

        equal( getTarget(Animal), Animal );
        equal( getTarget(Elephant), Elephant );

        equal( getTarget(new Animal), Animal );
        equal( getTarget(new Elephant), Elephant );

    })

    it('should works fine', () => {

        let Required = createMetaDecorator<boolean, false>('required', false);
        let Before = createDecorator((fn: Function) => fn, 'before', true);
        let After = createDecorator((fn: Function) => fn, 'after', true);

        class Animal {

            @Required(true)
            @Before(() => console.log('Name'))
            name!: string;

        }

        ok(hasMeta(Required, Animal, 'name'), `Animal.name must be decorated with Required`);
        ok(hasMeta(Before, Animal, 'name'), `Animal.name must be decorated with Before`);
        ok(!hasMeta(After, Animal, 'name'), `Animate.name should not have After decorator`);

        let isRequired = getMeta(Required, Animal, 'name');
        let befores = getMeta(Before, Animal, 'name');

        equal(isRequired, true);
        equal(befores?.length, 1);
        ok(befores![0] instanceof Function, `Before decorator must be instance of Functions`);

        class Elephant extends Animal {};

        ok(hasMeta(Required, Elephant, 'name'), `Elephant should inherit decorators from parent`);
        ok(getClassDecoratedProps(Elephant).has('name'), `Elephant.name property must be in decorated properties list grabbed from getClassDecoratedProps()`);

    });

    it('should works with inheritance', () => {

        let Model = createDecorator(function (name) {
            return {name};
        }, 'model', false);

        @Model('User')
        class User { }

        @Model('Admin')
        class Admin extends User { }

        ok(hasMeta(Model, User), `User should has Model decorator`);
        ok(hasMeta(Model, Admin), `Admin should has Model decorator`);

        notEqual(getMeta(Model, User), getMeta(Model, Admin));

        equal(getMeta(Model, User)?.name, 'User');
        equal(getMeta(Model, Admin)?.name, 'Admin');

    });

});