import { GraphQl } from "../../src/bundle/graph/Decorators";
import { equal, ok } from 'assert';
import { GraphQlSDLGenerator } from '../../src/bundle/graph/GraphQlSDLGenerator';

describe('GraphQl Bundle', () => {

    describe(`GraphQl SDL Generator`, () => {

        let generator: GraphQlSDLGenerator;

        beforeEach(() => {
            generator = new GraphQlSDLGenerator();
        });

        it('toGraphQlType', () => {
            equal(generator.toGraphQlType(Number), 'Int');
            equal(generator.toGraphQlType(String), 'String');
            equal(generator.toGraphQlType(Boolean), 'Bool');
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
            it('simple', () => {
                @GraphQl.Type()
                class User {
                    @GraphQl.Field() name!: string;
                    @GraphQl.Field({ description: 'Age of user' }) age!: Number;
                }
    
                equal(generator.toSDL(User), `type User {\n\tname: String\n\tage: Int # Age of user\n}`);    
            });

            it('Inheritance', () => {
                @GraphQl.Type()
                class Animal {
                    @GraphQl.Field() name!: string;
                }

                @GraphQl.Type()
                class Elephant extends Animal {
                    @GraphQl.Field() age!: number;

                    @GraphQl.Field() location(limit: number = 10): string {
                        return 'USA';
                    }
                }

                equal(generator.toSDL(Elephant), `type Elephant {\n\tname: String\n\tage: Int\n\tlocation(limit: Int = 10): String\n}`);
            });
        });

    });

});