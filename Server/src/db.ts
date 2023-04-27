import mongoose from 'mongoose';
import nodeCrypto from 'node:crypto';
import url from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
import { exists } from './util/exists.js';
// use mongoose unless u want to pain urself
mongoose.set("strictQuery", false);
let __dirname = url.fileURLToPath(new URL('.', import.meta.url));
let mongoURL = process.env.BURGERPANEL_MONGODB;
// If not found it will search up to 5 folders for mongodb_url.txt
if(!mongoURL) {
    let searchingPath = __dirname;
    searchLoop: for(let i = 0; i < 5; i++) {
        let pathToSearch = path.join(searchingPath, "mongodb_url.txt")
        if(await exists(pathToSearch)) {
            mongoURL = (await fs.readFile(pathToSearch)).toString().trim(); // set the mongodb url to the file contents and trim it
            break searchLoop;
        }
        searchingPath = path.join(searchingPath, "..");
    }
}
if(!mongoURL) {
    throw new Error("Unable to find mongodb url, searched for env var BURGERPANEL_MONGODB and mongodb_url.txt for 5 folders");
}
let db = await mongoose.connect(mongoURL);

db.connection.on('error', console.error.bind(console, 'connection error:'));
export let users = db.model("User", new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        maxlength: 24,
        required: true
    },
    createdAt: { type: Date, default: Date.now },
    token: {
        type: String,
        default: () => nodeCrypto.randomBytes(64).toString("base64url")
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
    }
}));
export let makeToken = () => nodeCrypto.randomBytes(64).toString("base64url");
export let servers = db.model("Server", new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        maxlength: 16
    },
    path: {
        type: String,
        unique: true,
        maxlength: 255,
        required: true
    },
    mem: Number,
    allowedUsers: [{
        user: String,
        permissions: [String]
    }],
    version: {
        type: String,
        maxlength: 16,
    },
    software: {
        type: String,
        maxlength: 7,
    },
    port: {
        min: 1,
        max: 65535,
        type: Number,
        unique: true
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
export let settings = db.model("Setting", new mongoose.Schema({
    key: {
        type: String,
        unique: true,
        maxlength: 255,
    },
    value: {
        type: String,
        maxlength: 255,
    },
}));