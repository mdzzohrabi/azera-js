import { deepStrictEqual, strictEqual } from "assert";
import * as mongoose from "mongoose";
import { Kernel, MongooseBundle, MongooseSchema, MongooseUtil } from "../../src";

describe('Mongoose', () => {

    it('bundle (CRUD)', async () => {

        let { Schema, Prop, Default, Required, Embed, Ref } = MongooseSchema;

        @Schema()
        class Author {
            @Prop() name!: string;
        }
        let AuthorModel = MongooseUtil.newModel(Author);

        @Schema()
        class Book {
            @Prop() @Required() title!: string;
            @Prop() @Default('Public') category!: string;
            @Ref(AuthorModel) author!: Author;
            @Prop() @Default(() => new Date) createdAt!: Date;
        }
        
        let BookModel = MongooseUtil.newModel(Book);

        let kernel = new Kernel('test', [ new MongooseBundle ]);

        await kernel.loadConfig({
            mongoose: {
                connections: {
                    main: {
                        uri: `mongodb://localhost:27017/test`,
                        useNewUrlParser: true,
                        useUnifiedTopology: true,
                        models: [BookModel, AuthorModel]
                    }
                }
            }
        });

        await kernel.boot();
        let authors = await kernel.container.invokeAsync<typeof AuthorModel>(AuthorModel);
        let books = await kernel.container.invokeAsync<typeof BookModel>(BookModel);

        // Clean database
        await books.deleteMany();
        await authors.deleteMany();

        deepStrictEqual(await books.find(), [], `Book collection must be empty`);
        
        await books.create({
            title: 'Alice in wonderland'
        });

        strictEqual(await books.countDocuments(), 1, `Books must be equals to one`);
        deepStrictEqual(
            (await books.findOne({ title: /Alice/ }, { title: 1, _id: 0 })).toObject(),
            { title: 'Alice in wonderland' },
            `Alice in wonderland must be exists in database`
        );

        let author = await authors.create({ name: 'Masoud' });
        await books.create({ title: 'Book 1', author: author });

        strictEqual( await books.countDocuments(), 2);

        strictEqual(await books.countDocuments({ author }), 1);


    });

})