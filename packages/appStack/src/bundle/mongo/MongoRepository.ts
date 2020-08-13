import { Collection } from "mongodb";

export abstract class MongoRepository<T> {}
export interface MongoRepository<T> extends Collection<T> {}