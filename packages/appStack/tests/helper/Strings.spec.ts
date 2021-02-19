import { strictEqual } from "assert";
import { camelCase, dasherize, format, humanize, pascalCase, snakeCase } from "../../src/helper/Strings";

describe('Strings', () => {
    it('camelCase', () => {
        strictEqual(camelCase('Hello world'), 'helloWorld');
        strictEqual(camelCase('Hello_world'), 'helloWorld');
        strictEqual(camelCase('HelloWorld'), 'helloWorld');
    });

    it('snakeCase',  () => {
        strictEqual(snakeCase('helloWorld'), 'hello_world');
        strictEqual(snakeCase('hello_World'), 'hello_world');
        strictEqual(snakeCase('hello World'), 'hello_world');
    });

    it('humanize', () => {
        strictEqual(humanize('hello-world'), 'Hello world');
        strictEqual(humanize('hello_world'), 'Hello world');
        strictEqual(humanize('helloWorld'), 'Hello world');
    });

    it('pascalCase', () => {
        strictEqual(pascalCase('hello-world'), 'HelloWorld');
        strictEqual(pascalCase('hello_world'), 'HelloWorld');
        strictEqual(pascalCase('helloWorld'), 'HelloWorld');
    });

    it('dasherize', () => {
        strictEqual(dasherize('helloWorld'), 'hello-world');
        strictEqual(dasherize('hello-World'), 'hello-world');
        strictEqual(dasherize('Hello_World'), 'hello-world');
        strictEqual(dasherize('hello World'), 'hello-world');
    });

    it('format', () => {
        strictEqual(format('Hello %s', 'Masoud'), 'Hello Masoud');
        strictEqual(format('{name} old is {old} years', { name: 'Masoud', old: 28 }), 'Masoud old is 28 years');
    });
});