// unrecommended for large servers
import DatabaseProvider, { Collection, DatabaseLookupFilter, DatabaseObject, DatabaseSchema, DatabaseSchemaInnerType, DatabaseType } from "./databaseProvider.js"
import path from "node:path";
import url from "node:url";
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
                await that.assertsFollowsSchema(this.toJSON());
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
        this.assertsFollowsSchema(obj);
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
        await this.assertsFollowsSchema(newData);
        this.insert(newData);
        return this.createDatabaseObject(newData);
    }
    async assertsFollowsSchema(data: T, schema: DatabaseSchema<T> = this.schema): Promise<never | undefined> {
        for await(let key of Object.keys(schema)) {
            let obj = schema[key as keyof typeof schema];
            if(Array.isArray(obj)) {
                // @ts-ignore
                for await(let dObj of Object.values(data[key] ?? [])) {
                    try {
                        await this.assertsFollowsSchema({
                            _id:"A",
                            __: dObj
                            // @ts-ignore
                        } as any as T, {_id:{type:"String"},__: obj[0]});
                    } catch(err) {
                        throw new Error(`Cannot validate object in array .${key}: ${(err as Error).message ?? err}`);
                    }
                }
            } else {
                // @ts-ignore
                let databaseObj: any = data[key];
                if(obj.required) {
                    if(typeof databaseObj == "undefined") throw new Error(`.${key} is undefined when its required`);
                } else {
                    if(typeof databaseObj == "undefined") continue;
                }
                if(obj.unique) {
                    if(schema != this.schema) throw new Error("Unique isnt allowed in arrays");
                    // @ts-ignore
                    let foundItems = await this.find({[key as keyof typeof T]: databaseObj});
                    let foundItemsWithoutSameID = foundItems.filter(a => a._id != data._id);
                    if(foundItemsWithoutSameID.length) throw new Error(`.${key} isnt unique!`);
                }
                if(obj.type == "number") {
                    if(typeof databaseObj != "number") throw new Error(`.${key} isnt a number when type is`);
                    if(isNaN(databaseObj)) throw new Error(`.${key} is nan`);
                    if(typeof obj.max == "number" && databaseObj > obj.max) throw new Error(`.${key} is too big (${databaseObj}) when ${obj.max} is max`);
                    if(typeof obj.min == "number" && databaseObj < obj.min) throw new Error(`.${key} is too small (${databaseObj}) when ${obj.min} is min`);
                } else if(obj.type == "String") {
                    if(typeof databaseObj != "string") throw new Error(`.${key} isnt a string when type is`);
                    if(typeof obj.maxlength == "number" && databaseObj.length > obj.maxlength) throw new Error(`String .${key} is too long!`);
                } else if(obj.type == "Date") {
                    if(typeof databaseObj != "number" || !Number.isInteger(databaseObj)) throw new Error(`.${key} is supposed to be a number because it's a date but it isnt`);
                } else if(obj.type == "boolean") {
                    if(typeof databaseObj != "boolean") throw new Error(`.${key} isnt a boolean when its supposed to be one!`);
                }
            }
        }
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
                    newData[key] = newData[key].filter((a: any) => a != undefined); // this is the most stupid fix for it randomly being null but it works so idc
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
            await obj.save();
        }
    }
    async countDocuments(filter: Partial<T>): Promise<number> {
        if(Object.keys(filter).length == 0) return (await this.getAll()).length;
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