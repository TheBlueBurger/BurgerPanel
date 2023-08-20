import type { JSONCollection } from "./json.js";
export default class DatabaseProvider {
    constructor() {

    }
    init() {this._unImplemented()}
    private _unImplemented() {
        throw new Error("Uninplemented database function!");
    }
    // @ts-expect-error
    getCollection<T extends DatabaseType>(name: string, schema: DatabaseSchema<T>): Collection<T> {this._unImplemented()}
}
export type DatabaseLookupFilter<T> = Partial<T>
export class Collection<T extends DatabaseType> {
    constructor(name: string, databaseProvider: DatabaseProvider) {}
    find(filter: DatabaseLookupFilter<T>, limit: number = 50): Promise<DatabaseObject<T>[]> {this._unImplemented()}
    findOne(filter: DatabaseLookupFilter<T>): Promise<DatabaseObject<T>> {this._unImplemented()}
    findById(id: string): Promise<DatabaseObject<T>> {this._unImplemented()}
    deleteById(id: string): Promise<void> {this._unImplemented()}
    getAll(): Promise<DatabaseObject<T>[]> {this._unImplemented()}
    private _unImplemented(): never {
        throw new Error("Uninplemented database function!");
    }
    isJSONCollection(): this is JSONCollection<T> {return false}
    // FIXME: fix when mongo implemented
    isMongoDBDatabaseProvider(): this is string {return false}
    create(data: Partial<Omit<T, "_id">>): Promise<DatabaseObject<T>> {this._unImplemented()}
    upsert(findBy: DatabaseLookupFilter<T>, newData: Partial<Omit<T, "_id">>): Promise<void> {this._unImplemented()}
    countDocuments(filter: DatabaseLookupFilter<T>): Promise<number> {this._unImplemented()}
    findByIdAndUpdate(id: string, newData: Partial<Omit<T, "_id">>): Promise<void> {this._unImplemented()}
}
export type DatabaseType = {
    _id: string
}
export type DatabaseObject<T> = T & {
    delete: () => Promise<void>,
    save: () => Promise<void>,
    toJSON: () => T,
    deleteOne: () => Promise<void>
}
export type DatabaseSchemaInnerType = {
    type: "Date" | "String" | "number" | "boolean",
    required?: boolean, // defaults to false
    unique?: boolean, // defaults to false
    maxlength?: number,
    max?: number,
    min?: number,
    default?: any
}
export type DatabaseSchema<T> = {
    [name in keyof T]: DatabaseSchemaInnerType | [DatabaseSchemaInnerType] | [{[key: string]: DatabaseSchemaInnerType}]
};
export function isFollowingSchema<T>(obj: DatabaseObject<T>, schema: DatabaseSchema<T>) {
    return true; // TODO: fix
}