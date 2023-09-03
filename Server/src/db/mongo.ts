import mongoose, { Mongoose } from "mongoose";
import DatabaseProvider, { Collection, DatabaseObject, DatabaseSchema, DatabaseType } from "./databaseProvider.js";
export default class MongoDatabaseProvider extends DatabaseProvider {
    private connection: Mongoose;
    private url: string;
    constructor(url: string) {
        super();
        this.url = url;
        this.connection = mongoose;
    }
    async init() {
        this.connection = await mongoose.connect(this.url);
    }
    getCollection<T extends DatabaseType>(name: string, _: DatabaseSchema<T>, schema: mongoose.Schema): Collection<T> {
        let coll = this.connection.model(name, schema);
        return new MongooseCollection(name, this, coll);
    }
}
export class MongooseCollection<T extends DatabaseType> extends Collection<T> {
    model: mongoose.Model<any, any, any, any, any, any>;
    constructor(name: string, databaseProvider: MongoDatabaseProvider, model: mongoose.Model<any, any, any, any, any, any>) {
        super(name, databaseProvider);
        this.model = model;
    }
    async countDocuments(filter: Partial<T>): Promise<number> {
        return await this.model.countDocuments(filter).exec();
    }
    async create(data: Partial<Omit<T, "_id">>): Promise<DatabaseObject<T>> {
        return await this.model.create(data);
    }
    async deleteById(id: string): Promise<void> {
        await this.model.findByIdAndDelete(id).exec();
    }
    async find(filter: Partial<T>, limit?: number): Promise<DatabaseObject<T>[]> {
        return await this.model.find(filter, {}, {limit}).exec();
    }
    isMongoDBDatabaseProvider(): this is MongooseCollection<T> {
        return true;
    }
    async findById(id: string): Promise<DatabaseObject<T>> {
        return await this.model.findById(id).exec(); 
    }
    async findByIdAndUpdate(id: string, newData: Partial<Omit<T, "_id">>): Promise<void> {
        await this.model.findByIdAndUpdate(id, newData).exec();
    }
    async findOne(filter: Partial<T>): Promise<DatabaseObject<T>> {
        return await this.model.findOne(filter).exec();
    }
    async getAll(): Promise<DatabaseObject<T>[]> {
        return await this.model.find({}, {}, {limit: 10_000});
    }
    async upsert(findBy: Partial<T>, newData: Partial<Omit<T, "_id">>): Promise<void> {
        return await this.model.findOneAndUpdate(findBy, newData, {upsert: true}).exec();
    }
    get _getModel() {
        return this.model;
    }
}