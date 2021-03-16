import { Container } from '@azera/container';
import { deepStrictEqual, ok, strictEqual } from 'assert';
import { ConfigResolver, ConfigSchema, GraphQlBundle, HttpBundle, is, Kernel } from '../../src';
import { GraphQl } from "../../src/bundle/graph/Decorators";
import { GraphQlBuilder } from '../../src/bundle/graph/GraphQlBuilder';
import { GraphQlManager } from '../../src/bundle/graph/GraphqlManager';
import { hasMeta } from '../../src/decorator/Metadata';

let { Type, Field, Input, Directive, Param, RequestConfig, Parent } = GraphQl;

describe('GraphQl Bundle', () => {

    describe(`GraphQl SDL Generator`, () => {

        let generator: GraphQlBuilder;

        beforeEach(() => {
            generator = new GraphQlBuilder();
        });

        it('toGraphQlType', () => {
            strictEqual(generator.toGraphQlType(Number), 'Int');
            strictEqual(generator.toGraphQlType(String), 'String');
            strictEqual(generator.toGraphQlType(Boolean), 'Boolean');
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
    
                strictEqual((await generator.build(User)).sdl, `type User {\n\tname: String\n\t"Age of user"\n\tage: Int\n}`);    
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

                    @Field() move(@Param() x: number = 10): string {
                        return 'USA';
                    }
                }

                strictEqual((await generator.build(Elephant)).sdl, `
type Elephant {\n\tname: String\n\tbase: Animal\n\tage: Int\n\tlocation(limit: Int = 10): String\n\tmove(x: Int = 10): String\n}
type Animal {\n\tname: String\n}
                `.trim());
            });
        });

        describe('Directive', () => {
            it('should resolve directive', async function () {
                this.timeout(1000);
                
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

                    @Field() hasUsername($$parent: User): boolean {
                        return !!$$parent.username;
                    }
                }

                @Input() class UserInput {
                    @Field() username!: string;
                }

                @Type() class Query {

                    @Field() version: string = '1.0.0';

                    @Field({ description: 'List of all users', type: [User] })
                    users( counter: Counter, $limit: number = 10): number[] {
                        return [counter.count, $limit];
                    }

                }

                @Type() class Mutation {
                    
                    @Field({type: '[String]'}) 
                    addUser(counter: Counter, $user: UserInput): string[] {
                        return ['ok', counter.count.toString(), $user.username];
                    }

                }

                let result = await generator.build(Query, Mutation);

                strictEqual(
                    result.sdl,
`type Query {\n\tversion: String\n\t"List of all users"\n\tusers(limit: Int = 10): [User]\n}
type Mutation {\n\taddUser(user: UserInput!): [String]\n}
"User type"
type User {\n\tusername: String\n\thasUsername: Boolean\n}
input UserInput {\n\tusername: String\n}`
                )

                ok('Query' in result.resolvers, `Resolvers must contain Query`);
                ok('User' in result.resolvers, `Resolvers must contain User`);
                ok('Mutation' in result.resolvers, `Resolvers must contain Mutation`);
                ok(result.resolvers.Query instanceof Query, `resolvers.Query must be instance of Query class`);
                ok(result.resolvers.User instanceof User, `resolvers.User must be instance of User class`);

                deepStrictEqual(
                    await result.resolvers.User.hasUsername({ username: 'MyName' }),
                    true
                );

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

        describe('Bundle', () => {
            it('should works ok', async () => {

                @Type()
                class Query {
                    @Field() version(): string {
                        return '1.0.0'
                    }
                }

                let configSchema = new ConfigSchema();                
                let bundle = new GraphQlBundle();

                bundle.init(configSchema);

                let configResolver = new ConfigResolver(configSchema);
                let config = await configResolver.resolve({
                    graphql: {
                        nodes: {
                            app: {
                                path: '/graphql',
                                types: [ Query ]
                            }
                        }
                    }
                });

                let manager = new GraphQlManager;
                let container = new Container();
                container.setParameter('config', config);
                container.setFactory(Kernel, () => null as any);

                await bundle.boot(container, manager);

                strictEqual(container.findByTag(HttpBundle.DI_TAG_MIDDLEWARE).length , 1);
                strictEqual(container.findByTag(HttpBundle.DI_TAG_MIDDLEWARE)[0].name, 'graphql_node_app_middleware');
                strictEqual(container.has('graphql_node_app'), true);

                let middle = (await container.getByTagAsync(HttpBundle.DI_TAG_MIDDLEWARE)).pop();

                ok(is.Function(middle), `GraphQl node must be Function`);

            });
        })

        describe('GraphQlManager', () => {
            it('should execute query with execute()', async () => {

                @Type() class User {
                    public friends: string[] = [];
                    @Field() public name!: string;
                    @Field() isFriend(
                        @Parent() user: User,
                        @Param() username: string
                    ): boolean {
                        return user.friends.includes(username) ? true : false;
                    }
                }
                
                @Type() class Query {
                    @Field() version: string = '1.0.0';
                    @Field() hello($name: string): string { return `Hello ${$name}`; }
                    @Field() user(): User {
                        return { name: 'Masoud', friends: [ 'Alireza' ] } as any;
                    }
                }

                let builder = new GraphQlBuilder();
                let manager = new GraphQlManager();
                
                let schema = await builder.buildSchema(Query);
                manager.addNode('public', { schema });

                deepStrictEqual(
                    { ...(await manager.execute('public', { query: `{ version }` })).data },
                    { version: '1.0.0' }
                );

                deepStrictEqual(
                    JSON.parse(JSON.stringify({ ...(await manager.execute('public', { query: `{ user { name isFriend(username: "Alireza") } }` })).data })),
                    { user: { name: 'Masoud', isFriend: true } }
                );
            });

            it('should execute http controller with graphql query decorated with GraphQl.Request', async () => {

                @Type() class Query {
                    @Field() version: string = '1.0.0';
                }

                @GraphQl.RequestConfig({ nodeName: 'public' })
                class VersionController {
                    @GraphQl.Request(`{ version }`) version() { return 'OK'; }
                }

                let container = new Container();
                let builder = await container.invokeAsync(GraphQlBuilder);
                let manager = await container.invokeAsync(GraphQlManager);
                
                let schema = await builder.buildSchema(Query);
                manager.addNode('public', { schema });

                let controllerResult = await container.invokeAsync(VersionController, 'version' as any);

                deepStrictEqual(
                    { ...controllerResult },
                    {
                        version: '1.0.0'
                    }
                );
            });

        });
    });

});