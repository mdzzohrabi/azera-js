import type { Collection, Document } from "mongodb";

export abstract class MongoRepository<T> {}
export interface MongoRepository<T extends Document> extends Collection<T> {}