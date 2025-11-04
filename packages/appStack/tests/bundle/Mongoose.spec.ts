import { equal } from "node:assert";
import { Kernel, MongooseBundle, MongooseSchema, MongooseUtil } from "../../src";

describe('Bundle -> Mongoose', () => {

    let { Schema, Prop, Default, Required, Embed, Ref } = MongooseSchema;

    @Schema() class AuthorSchema {
        @Prop() name!: string;
    }
    let Author = MongooseUtil.newModel(AuthorSchema);

    @Schema() class BookSchema {
        @Prop() @Required() title!: string;
        @Prop() @Default('Public') category!: string;
        @Ref(Author) author!: AuthorSchema;
        @Prop() @Default(() => new Date) createdAt!: Date;
    }

    let Book = MongooseUtil.newModel(BookSchema);

    let kernel = new Kernel('test', [new MongooseBundle]);

    before(async () => {
        await kernel.loadConfig({
            mongoose: {
                connections: {
                    main: {
                        uri: `mongodb://localhost:27017/test`,
                        // useNewUrlParser: true,
                        // useUnifiedTopology: true,
                        models: [Book, Author]
                    }
                }
            }
        });

        await kernel.boot();
    });

    const container = kernel.container;

    it('container must have Book and Author models', function () {
        var author = container.invoke(Author);
        var book = container.invoke(Book);

        equal('model' in author, true, 'Author not exists in container');
        equal('model' in book, true, 'Book not exists in container');
    });

    it('models must refer to test database connection', () => {
        let author = container.invoke(Author);
        equal((author.db.getClient().options.dbName), 'test', 'Database must be test');
    });
});

