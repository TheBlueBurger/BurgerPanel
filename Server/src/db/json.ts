// unrecommended for large servers
import DatabaseProvider, { Collection, DatabaseLookupFilter, DatabaseObject, DatabaseSchema, DatabaseSchemaInnerType, DatabaseType, isFollowingSchema } from "./databaseProvider.js"
import path from "node:path";
import url from "node:url";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { exists } from "../util/exists.js";
import nodeCrypto from "node:crypto";
const isProd = process.env.NODE_ENV == "production";
let __dirname = url.fileURLToPath(new URL('.', import.meta.url));
type JSONStructure = {
    [collection: string]: any[];
}
export default class JSONDatabaseProvider extends DatabaseProvider {
    path: string;
    currentFullJSON: JSONStructure = {};
    constructor(path: string) {
        super();
        this.path = path;
    }
    async init() {
        if(!path.isAbsolute(this.path)) this.path = path.join(isProd ? __dirname : process.cwd(), this.path);
        try {
            if(!await exists(this.path)) fsSync.writeFileSync(this.path, "{}");
            let data = (await fsSync.readFileSync(this.path)).toString();
            this.currentFullJSON = JSON.parse(data);
        } catch(err) {
            throw new Error(`Cannot load '${this.path}': ${err}`);
        }
    }
    getCollection<T extends DatabaseType>(name: string, schema: DatabaseSchema<T>) {
        return new JSONCollection<T>(name, schema, this);
    }
    async saveJSON() {
        await fsSync.writeFileSync(this.path, JSON.stringify(this.currentFullJSON, null, 2));
    }
}
export class JSONCollection<T extends DatabaseType> extends Collection<T> {
    databaseProvider: JSONDatabaseProvider;
    name: string;
    schema: DatabaseSchema<T>;
    constructor(name: string, schema: DatabaseSchema<T>, databaseProvider: JSONDatabaseProvider) {
        super(name, databaseProvider);
        if(typeof databaseProvider.currentFullJSON[name] != "object") databaseProvider.currentFullJSON[name] = [];
        this.databaseProvider = databaseProvider;
        this.name = name;
        this.schema = schema;
    }
    private getCurrentData(): T[] {
        return this.databaseProvider.currentFullJSON[this.name];
    }
    async find(filter: DatabaseLookupFilter<T>, limit: number = 50): Promise<DatabaseObject<T>[]> {
        let data = this.getCurrentData();
        if(Object.keys(filter).length == 0) throw new Error("empty filter, do you want .getAll()?");
        let matched = data;
        for(let key of Object.keys(filter)) {
            matched = matched.filter(m => m[key as keyof T] == filter[key as keyof T]);
        }
        // limit is kinda useless when doing this way but for compatibility its needed
        matched = matched.slice(0, limit);
        return matched.map(match => this.createDatabaseObject(match));
    }
    async findOne(filter: DatabaseLookupFilter<T>) {
        return (await this.find(filter, 1))[0];
    }
    async findById(id: string): Promise<DatabaseObject<T>> {
        // @ts-ignore
        let found = await this.find({_id: id});
        return found[0];
    }
    private createDatabaseObject(obj: T): DatabaseObject<T> {
        if(!obj?._id) throw new Error("Missing _id");
        let that = this;
        let newObj = {
            ...obj,
            async delete() {
                await that.deleteById(obj._id);
            },
            async deleteOne() {
                await newObj.delete();
            },
            async save() {
                if(!isFollowingSchema(this, that.schema)) throw new Error("Doesnt follow schema!");
                await this.delete();
                await that.insert(this.toJSON());
            },
            toJSON() {
                let newObj = {};
                for(let _key of Object.keys(this)) {
                    let key = _key as keyof DatabaseObject<T>;
                    if(this[key] instanceof Function) continue;
                    // @ts-ignore i cant bother
                    newObj[key] = this[key];
                }
                return newObj as T;
            }
        }
        return newObj;
    }
    private insert(obj: T) {
        this.databaseProvider.currentFullJSON[this.name].push(obj);
        this.databaseProvider.saveJSON();
    }
    async deleteById(id: string) {
        this.databaseProvider.currentFullJSON[this.name] = this.databaseProvider.currentFullJSON[this.name].filter(obj => obj?._id != id);
        await this.databaseProvider.saveJSON();
    }
    isJSONCollection(): this is JSONCollection<T> {
        return true;
    }
    async getAll(): Promise<DatabaseObject<T>[]> {
        return this.getCurrentData().map(obj => this.createDatabaseObject(obj));
    }
    async create(data: Partial<Omit<T, "_id">>): Promise<DatabaseObject<T>> {
        let newData = this.bootstrapNecessaryTypes(data);
        this.insert(newData);
        return this.createDatabaseObject(newData);
    }
    bootstrapNecessaryTypes(data: Partial<Omit<T, "_id">>, schema: DatabaseSchema<T> = this.schema, includeID: boolean = true): T {
        let newData: any = {};
        Object.keys(data).forEach(key => {
            newData[key] = data[key as keyof typeof data];
        });
        Object.keys(schema).forEach((key) => {
            if(Array.isArray(schema[key as keyof typeof schema])) {
                // @ts-ignore
                let insideArr: any = schema[key as keyof typeof schema][0];
                if(typeof insideArr?.type == "string") {
                    // @ts-ignore
                    newData[key] = this.bootstrapNecessaryTypes({__:data[key]} ?? {}, {__: schema[key as keyof typeof schema][0]}).__;
                } else {
                    // @ts-ignore
                    newData[key] = Object.values(this.bootstrapNecessaryTypes(data[key] ?? {}, insideArr, false));
                }
            } else {
                if((schema[key as keyof typeof schema] as DatabaseSchemaInnerType)?.default && typeof data[key as keyof typeof data] == "undefined") {
                    if((schema[key as keyof typeof schema] as DatabaseSchemaInnerType).default instanceof Function) {
                        newData[key] = (schema[key as keyof typeof schema] as DatabaseSchemaInnerType).default()
                    } else {
                        newData[key] = (schema[key as keyof typeof schema] as DatabaseSchemaInnerType).default
                    }
                }
            }
        });
        if(includeID && typeof newData._id == "undefined") newData._id = this.findUnusedID();
        return newData;
    }
    private findUnusedID() {
        let all = this.getCurrentData();
        while(true) {
            let id = nodeCrypto.randomBytes(10).toString("hex");
            if(!all.some(a => a._id == id)) return id;
        }
    }
    async upsert(findBy: Partial<T>, newData: Partial<Omit<T, "_id">>) {
        let obj = await this.findOne(findBy);
        if(!obj) {
            this.create({
                ...findBy,
                ...newData
            });
            return;
        } else {
            for(let key of Object.keys(newData)) {
                // @ts-ignore
                obj[key as keyof typeof obj] = newData[key as keyof typeof newData];
            }
        }
    }
    async countDocuments(filter: Partial<T>): Promise<number> {
        return (await this.find(filter)).length;
    }
    async findByIdAndUpdate(id: string, newData: Partial<Omit<T, "_id">>): Promise<void> {
        let obj = await this.findById(id);
        for(let key of Object.keys(newData)) {
            // @ts-ignore
            obj[key as keyof typeof obj] = newData[key as keyof typeof newData];
        }
        await obj.save();
    }
}