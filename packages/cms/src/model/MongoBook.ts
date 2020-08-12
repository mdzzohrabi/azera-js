import { mongoose, MongooseUtil, MongooseSchema } from "@azera/stack";

// let schema = new mongoose.Schema({
//     name: String,
//     title: String
// });

// export let MongoBook = mongoose.model('Book', schema);
let { Prop , Schema, Required, Ref } = MongooseSchema;

@Schema('Category', 'category')
export class CategorySchema {
    @Prop() name!: string
}

@Schema('Company', 'company')
export class CompanySchema {
    @Prop() name!: string
}

@Schema('Product', 'product')
export class MongoBookSchema {

    @Prop()
    @Required()
    name!: String

    @Ref('Category')
    categories!: CategorySchema[]

    @Ref('Category')
    subCategory!: CategorySchema

    @Ref('Company')
    company!: CompanySchema

}

export let MongoBook = MongooseUtil.newModel(MongoBookSchema);
export let Category = MongooseUtil.newModel(CategorySchema);
export let Company = MongooseUtil.newModel(CompanySchema);