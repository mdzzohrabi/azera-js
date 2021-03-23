import { deepStrictEqual, strictEqual } from "assert";
import { Kernel, MongooseBundle, MongooseSchema, MongooseUtil } from "../../src";
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { mkdirSync, existsSync, unlinkSync } from 'fs';

describe('Mongoose', () => {
    
    let dbPath = __dirname + '/../../var/db';
    let db: ChildProcessWithoutNullStreams;

    before(async () => {
        // Start database service
        if (!existsSync(dbPath)) mkdirSync(dbPath, { recursive: true });
        
        db = spawn(`mongod`, [`--dbpath`, dbPath]);
    });

    after(() => {
        // Kill database
        db.on('close', () => {
            try {
                if (existsSync(dbPath)) unlinkSync(dbPath);
            } catch {}
        });
        db.kill('SIGINT');
    });

    it('bundle (CRUD)', async function () {
        this.timeout(10000);

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
            (await books.findOne({ title: /Alice/ }, { title: 1, _id: 0 }))?.toObject(),
            { title: 'Alice in wonderland' },
            `Alice in wonderland must be exists in database`
        );

        let author = await authors.create({ name: 'Masoud' });
        await books.create({ title: 'Book 1', author: author });

        strictEqual( await books.countDocuments(), 2);

        strictEqual(await books.countDocuments({ author }), 1);


    });

})