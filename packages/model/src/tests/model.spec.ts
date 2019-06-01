import {CollectionOf, Default, Field, Model, Required, Schema, toModel, mongoose} from "../index";
import {deepEqual, equal, ok} from "assert";
import { suite, test } from 'mocha-typescript';
import { Constructor } from '@azera/util/types';
import { hasMany, hasOne } from '../decorator';

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
    

    @test "hasOne/hasMany"() {
        class IBook {
            @Field() name: string;
        }

        class IAuthor {
            @hasMany(IBook) books: IBook[];
            @hasOne(IBook) firstBook: IBook;
            @hasMany(IBook, { subDoc: true }) subBooks: IBook[];
            @hasOne(IBook, { subDoc: true }) subFirstBook: IBook;
        }

        let Author = toModel(IAuthor);

        equal( Author.schema.obj['books'].type[0].ref, 'IBook' );
        equal( Author.schema.obj['firstBook'].type.ref, 'IBook' );
     
        ok( Author.schema.obj['subBooks'].type[0] instanceof mongoose.Schema );
        ok( Author.schema.obj['subFirstBook'].type instanceof mongoose.Schema );
    }

}