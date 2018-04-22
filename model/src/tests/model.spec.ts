import {CollectionOf, Default, Field, Model, Required, Schema, toModel} from "../index";
import {deepEqual, equal} from "assert";
import { suite, test } from 'mocha-typescript';
import { Constructor } from '@azera/util/types';

@suite('Mongo Model')
class MongoModalTest {

    @test "should works"() {
        class Question {}

        interface Link {
            url: string;
        }

        class Exam {
            @Field() @Required() @Default("Masoud") name: string;
            @Field() createdOn: Date;
            @CollectionOf(Question) questions: Question[];
            @Field() links: Link[];

            isEnable() {
                return true;
            }
        }

        @Schema({ collection: 'exams' })
        class ExamRepository extends Model<Exam> {

            hasName() {
                return true;
            }

            static findLimited() {
                this.findOne().then((result: Exam) => {
                    return result.createdOn;
                });
            }
        }
        
        let model = toModel(Exam, ExamRepository);

        model.findOne().then(result => {
            result.isEnable;
            return result.createdOn;
        });

        model.findLimited();

        equal(model.modelName, 'Exam');
        equal(model.schema.obj['name'].default, "Masoud");
        deepEqual(model.schema.requiredPaths(), [ 'name' ]);
        deepEqual( Object.keys(model.schema.methods) , [ 'isEnable', 'hasName', 'toHexString' ]);
        deepEqual( Object.keys(model.schema.statics), [ 'findLimited' ] );

        equal(model.schema.obj['questions']['type'][0]['ref'], 'Question');
    }
    
}