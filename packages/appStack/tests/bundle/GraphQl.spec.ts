import { GraphQl } from "../../src/bundle/graph/Decorators";
import { equal, ok } from 'assert';
import { GraphQlSDLGenerator } from '../../src/bundle/graph/GraphQlSDLGenerator';

let { Type, Field } = GraphQl;

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
                @Type()
                class Animal {
                    @Field() name!: string;
                }

                
                @Type()
                class Elephant extends Animal {
                    @Field() base!: Animal;

                    @Field() age!: number;

                    @Field() location(_parent: Animal, limit: number = 10): string {
                        return 'USA';
                    }
                }

                equal(generator.toSDL(Elephant), `type Elephant {\n\tname: String\n\tbase: Animal\n\tage: Int\n\tlocation(limit: Int = 10): String\n}`);
            });
        });

    });

});