import { Constructor } from '@azera/util';

type Class = {new(...args: any[]): {}}

function trait<A extends Class, B extends Class>(_class: A): A
function trait<A extends Class, B extends Class>(_class: A, trait1?: B): A & B
function trait<A extends Class, B extends Class, C extends Class>(_class: A, trait1?: B, trait2?: C): A & B & C
function trait<A extends Class, B extends Class, C extends Class, D extends Class>(_class: A, trait1?: B, trait2?: C, trait3?: D): A & B & C & D
function trait(_class: Class, ...traits: Class[])
{
    traits.forEach(trait => {
        let traitProps = Object.getOwnPropertyDescriptors(trait.prototype);
        let targetProps = Object.getOwnPropertyNames(_class.prototype);

        for (let name in traitProps) {
            if ( traitProps[name].value == trait ) continue;
            if ( targetProps.includes(name) ) throw Error(`${ name } property already exists in target class`);
            Object.defineProperty(_class.prototype, name, traitProps[name]);
        }

    });

    return _class as any;
}

export function Trait(_class: Function, ...properties: string[]) {
    return function traitDecorator(target: Function) {

        let traitProps = Object.getOwnPropertyDescriptors(_class.prototype);
        let targetProps = Object.getOwnPropertyNames(target.prototype);

        console.log();
        console.log(Object.getOwnPropertyDescriptors(target.prototype));

    }
}

type Trait<T, P> = { new(...args: any[]): P };

class A {
    hello() {}
}

let d: Trait<Person, A> = class {} as any;
(new d()).hello();

class Person {
    constructor(public last: string) {}
    public name: string = '';
    getName() { return this.name }
    get hello() { return 12 }
}

let Masoud = trait(class Masoud {
    constructor(public name: string) {}
}, Person);

let s = new Masoud('Reza');

// console.log(s.getName());