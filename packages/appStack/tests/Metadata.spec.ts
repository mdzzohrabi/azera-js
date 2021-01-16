import { notStrictEqual, ok, strictEqual } from 'assert';
import { createDecorator, createMetaDecorator, getClassDecoratedProps, getMeta, getMetaMap, getTarget, hasMeta } from "../src";

describe('Metadata', () => {

    it('getTarget() should works fine', () => {
        class Animal {}
        class Elephant extends Animal {}

        strictEqual( getTarget(Animal), Animal );
        strictEqual( getTarget(Elephant), Elephant );

        strictEqual( getTarget(new Animal), Animal );
        strictEqual( getTarget(new Elephant), Elephant );

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

        strictEqual(isRequired, true);
        strictEqual(befores?.length, 1);
        ok(befores![0] instanceof Function, `Before decorator must be instance of Functions`);

        class Elephant extends Animal {};

        ok(hasMeta(Required, Elephant, 'name'), `Elephant should inherit decorators from parent`);
        ok(getClassDecoratedProps(Elephant).has('name'), `Elephant.name property must be in decorated properties list grabbed from getClassDecoratedProps()`);

    });

    it('parameter meta-data', () => {

        let Required = createMetaDecorator<undefined, false>('required');

        class User {
            saved(@Required() collectionName: string) {}
        }

        class Author extends User {}

        ok(hasMeta(Required, User, 'saved', 0), `User.saved parameter 0 must have Required meta-data`);
        ok(hasMeta(Required, Author, 'saved', 0), `Author.saved parameter 0 must have Required meta-data inherited from User`);
        ok(getMeta(Required, Author, 'saved', 0) != getMeta(Required, User, 'saved', 0), `Inherited Metadata for parameters must not equals to each others`);
        

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

        notStrictEqual(getMeta(Model, User), getMeta(Model, Admin));

        strictEqual(getMeta(Model, User)?.name, 'User');
        strictEqual(getMeta(Model, Admin)?.name, 'Admin');

    });

});