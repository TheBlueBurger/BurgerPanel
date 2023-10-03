import mongoose from 'mongoose';
import nodeCrypto from 'node:crypto';
import url from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
import { exists } from './util/exists.js';
import DatabaseProvider, { DatabaseSchema, DatabaseType } from './db/databaseProvider.js';
import JSONDatabaseProvider from './db/json.js';
import { User } from '../../Share/User.js';
import { Server } from '../../Share/Server.js';
import MongoDatabaseProvider from './db/mongo.js';
// use mongoose unless u want to pain urself
mongoose.set("strictQuery", false);
if(process.env.BURGERPANEL_MONGOOSE_DEBUG) mongoose.set("debug", true)
let __dirname = url.fileURLToPath(new URL('.', import.meta.url));
let mongoURL = process.env.BURGERPANEL_MONGODB;
if(!mongoURL) mongoURL = process.env.DB;
// If not found it will search up to 5 folders for mongodb_url.txt
if(!mongoURL) {
    let searchingPath = __dirname;
    for(let i = 0; i < 5; i++) {
        let pathToSearch = path.join(searchingPath, "mongodb_url.txt")
        if(await exists(pathToSearch)) {
            mongoURL = (await fs.readFile(pathToSearch)).toString().trim(); // set the mongodb url to the file contents and trim it
            break;
        }
        searchingPath = path.join(searchingPath, "..");
    }
}
if(!mongoURL) {
    throw new Error("Unable to find mongodb url, searched for env vars BURGERPANEL_MONGODB and DB, and file mongodb_url.txt for 5 folders.\n" + 
    "If you don't want to set up a mongo server you can set it to `json:path` to store it in JSON files (unrecommended for big servers)");
}
let databaseManager = new class DatabaseManager {
    databaseProvider: DatabaseProvider;
    constructor() {
        if(mongoURL?.startsWith("json:")) this.databaseProvider = new JSONDatabaseProvider(mongoURL.replace("json:", ""));
        else this.databaseProvider = new MongoDatabaseProvider(mongoURL as string);
    }
    async _init() {
        await this.databaseProvider.init();
    }
    collection<T extends DatabaseType>(name: string, schema: DatabaseSchema<T>, mongooseSchema: mongoose.Schema) {
        return this.databaseProvider.getCollection<T>(name, schema, mongooseSchema);
    }
}
await databaseManager._init();

export let makeToken = () => nodeCrypto.randomBytes(64).toString("base64url");
export let users = databaseManager.collection<User>("User", {
    _id: {type: "String"},
    username: {type: "String"},
    createdAt: {type: "Date", default: Date.now},
    permissions: [{type: "String", default: []}],
    setupPending: {type: "boolean", default: true},
    token: {type: "String", default: makeToken},
    devMode: {type: "boolean", default: false},
    password: {type: "String"},
    pins: [{type: "String", default: []}]
}, new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        maxlength: 24,
        required: true
    },
    createdAt: { type: Date, default: Date.now },
    token: {
        type: String,
        default: makeToken
    },
    permissions: {
        type: [String],
        default: []
    },
    password: {
        type: String
    },
    setupPending: {
        type: Boolean,
        default: true
    },
    devMode: {
        type: Boolean,
        required: false,
        default: false
    },
    pins: [{
        type: String,
        max: 3,
        default: [],
        validate: [(v: any) => v.length >= 10, "Too many pinned servers"]
    }]
}));

export let servers = databaseManager.collection<Server>("Server", {
    name: {
        type: "String",
        unique: true,
        maxlength: 16,
        required: true
    },
    path: {
        type: "String",
        unique: true,
        maxlength: 255,
        required: true
    },
    mem: {
        type: "number",
        min: 0,
        max: 99999,
        required: true
    },
    jvmArgs: {
        type: "String",
        maxlength: 99999,
        required: false
    },
    allowedUsers: [{
        user: {type: "String"},
        permissions: [{type: "String"}],
    }],
    version: {
        type: "String",
        maxlength: 16,
        required: true
    },
    software: {
        type: "String",
        maxlength: 7,
        required: true
    },
    port: {
        min: 1,
        max: 65535,
        type: "number",
        unique: true,
        required: true
    },
    autoStart: {
        type: "boolean",
        default: false
    },
    autoRestart: {
        type: "boolean",
        default: false
    },
    useCustomJVMArgs: {
        type: "boolean",
        default: false
    },
    _id: {
        type: "String"
    }
}, new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        maxlength: 16,
        required: true
    },
    path: {
        type: String,
        unique: true,
        maxlength: 255,
        required: true
    },
    mem: {
        type: Number,
        min: 0,
        max: 99999,
        required: true
    },
    allowedUsers: [{
        user: String,
        permissions: [String],
        /*roles: [mongoose.Types.ObjectId]*/
    }],
    version: {
        type: String,
        maxlength: 16,
        required: true
    },
    software: {
        type: String,
        maxlength: 7,
        required: true
    },
    port: {
        min: 1,
        max: 65535,
        type: Number,
        unique: true,
        required: true
    },
    autoStart: {
        type: Boolean,
        default: false
    },
    autoRestart: {
        type: Boolean,
        default: false
    }
}));

export let settings = databaseManager.collection<{_id: string, key: string, value: string}>("Setting", {
    key: {
        type: "String",
        unique: true,
        maxlength: 255,
    },
    value: {
        type: "String",
        maxlength: 1000,
    },
    _id: {
        type: "String"
    }
}, new mongoose.Schema({
    key: {
        type: String,
        unique: true,
        maxlength: 255,
    },
    value: {
        type: String,
        maxlength: 1000,
    },
}));