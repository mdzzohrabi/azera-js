# Azera model

Specially designed for TypeScript. required to enable `emitDecoratorMetadata` in your `tsconfig.json`.

Create model :
```ts
interface Link {
    url: string;
}

class Question {
    @Field() question: string;
}

@Schema({ collection: 'questions' }) // Optional decorator
class QuestionRepo extends Model<Question> {}

class Exam {
    @Field() @Required() @Default("Sample exam") name: string;
    @Field() createdOn: Date;
    @CollectionOf(Question) questions: Question[];
    @Field() links: Link[];
}

@Schema({ collection: 'exams' }) // Optional decorator
class ExamRepo extends Model<Exam> {

    get hasQuestions() {
        return this.questions.length > 0;
    }

    static findByQuestion(q: Question) {
        return this.find( /* Condition logic */ );
    }

}

// Generate mongoose model
const ExamModel = toModel(Exam, ExamRepo);
const QuestionModel = toModel(Question, QuestionRepo);

// Sample
let q = new Question();
ExamModel.findByQustion(q);

// Sample
let exam = ExamModel.findById(/* Any Id */);
console.log( exam.hasQuestions ? 'Has question' : 'No questions' );
```