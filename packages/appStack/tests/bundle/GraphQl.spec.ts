import { deepStrictEqual, ok, strictEqual } from 'assert';
import { hasMeta, Inject } from '../../src';
import { GraphQl } from "../../src/bundle/graph/Decorators";
import { GraphQlBuilder } from '../../src/bundle/graph/GraphQlBuilder';

let { Type, Field, Input, Directive } = GraphQl;

describe('GraphQl Bundle', () => {

    describe(`GraphQl SDL Generator`, () => {

        let generator: GraphQlBuilder;

        beforeEach(() => {
            generator = new GraphQlBuilder();
        });

        it('toGraphQlType', () => {
            strictEqual(generator.toGraphQlType(Number), 'Int');
            strictEqual(generator.toGraphQlType(String), 'String');
            strictEqual(generator.toGraphQlType(Boolean), 'Bool');
        });

        it('isValidType()', () => {
            class InvalidType {}

            @GraphQl.Type()
            class User {
                @GraphQl.Field() name!: string;
            }

            ok(generator.isValidType(User));
            ok(!generator.isValidType(InvalidType));
        })

        describe(`Convert (toSDL)`, () => {
            it('simple', async () => {
                @GraphQl.Type()
                class User {
                    @GraphQl.Field() name!: string;
                    @GraphQl.Field({ description: 'Age of user' }) age!: Number;
                }
    
                strictEqual((await generator.build(User)).sdl, `type User {\n\tname: String\n\tage: Int # Age of user\n}`);    
            });

            it('Inheritance', async () => {
                @Type()
                class Animal {
                    @Field() name!: string;
                }
                
                @Type()
                class Elephant extends Animal {
                    @Field() base!: Animal;

                    @Field() age!: number;

                    @Field() location(parent: Animal, $limit: number = 10): string {
                        return 'USA';
                    }
                }

                strictEqual((await generator.build(Elephant)).sdl, `
type Elephant {\n\tname: String\n\tbase: Animal\n\tage: Int\n\tlocation(limit: Int = 10): String\n}
type Animal {\n\tname: String\n}
                `.trim());
            });
        });

        describe('Directive', () => {
            it('should resolve directive', async () => {

                class Directives {
                    @Directive() static fetch($url: string ): any {
                        console.trace('ok');
                    }
                }
                
                let { directives, typeDefs } = await generator.buildDirectives(Directives);

                strictEqual(directives.length, 1);
                strictEqual(Directives.fetch.name, 'FieldDirective');

                class Query {
                    @Directives.fetch('/users')
                    users() {}
                }

                ok(hasMeta(GraphQl.FieldDirective, Query, 'users'), `Query.users must be decorated with FieldDirective`);

                strictEqual(
                    typeDefs.join(''),
                    `directive @fetch(url: String!) on FIELD_DEFINITION`
                )

            });
        });

        describe('Full', () => {
            it('should generate successful', async () => {

                class Counter {
                    count = 10
                }

                class Directives {

                    @Directive() static fetch($url: string): PropertyDecorator {
                        console.trace('ok');
                        return true as any
                    }
                    
                }

                @Type({ description: 'User type' }) class User {
                    @Directives.fetch(`/user/username`)
                    @Field() username!: string;
                }

                @Input() class UserInput {
                    @Field() username!: string;
                }

                @Type() class Query {

                    @Inject()
                    @Field({ description: 'List of all users', type: [User] })
                    users( counter: Counter, $limit: number = 10) {
                        return [counter.count, $limit];
                    }

                }

                @Type() class Mutation {
                    
                    @Field({type: '[String]'}) 
                    addUser(@Inject() counter: Counter, $user: UserInput): string[] {
                        return ['ok', counter.count.toString(), $user.username];
                    }

                }

                let result = await generator.build(Query, Mutation);

                strictEqual(
                    result.sdl,
`type Query {\n\tusers(limit: Int = 10): [User] # List of all users\n}
type Mutation {\n\taddUser(user: UserInput!): [String]\n}
# User type
type User {\n\tusername: String\n}
input UserInput {\n\tusername: String\n}`
                )

                ok('Query' in result.resolvers, `Resolvers must container Query`);
                ok('User' in result.resolvers, `Resolvers must container User`);
                ok('Mutation' in result.resolvers, `Resolvers must container Mutation`);
                ok(result.resolvers.Query instanceof Query, `resolvers.Query must be instance of Query class`);              

                deepStrictEqual(
                    await result.resolvers.Query.users(null, { limit: 20, first: 0 }),
                    [10, 20]
                );

                deepStrictEqual(
                    await result.resolvers.Mutation.addUser(null, { user: { username: 'Alireza' } }),
                    ['ok', '10', 'Alireza']
                )

                let schema = generator.buildSchema(Query, Mutation);

                strictEqual( (await schema).getType('User')?.description , 'User type');

                let { directives, typeDefs } = await generator.buildDirectives(Directives);

                strictEqual(Directives.fetch.name, 'FieldDirective');

                strictEqual(directives.length, 1);

            });
        });
    });

});