import mongoose from 'mongoose';
import nodeCrypto from 'node:crypto';
import logger, { LogLevel } from './logger.js';
import url from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
// use mongoose unless u want to pain urself
mongoose.set("strictQuery", false);
let __dirname = url.fileURLToPath(new URL('.', import.meta.url));
let mongoURL = process.env.BURGERPANEL_MONGODB;
if(!mongoURL) mongoURL = (await fs.readFile(path.join(__dirname, "mongodb_url.txt"))).toString();
let db = await mongoose.connect(mongoURL);

db.connection.on('error', console.error.bind(console, 'connection error:'));
logger.log("Connected to database", undefined, LogLevel.DEBUG, false);
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
    }
}));
export let servers = db.model("Server", new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        maxlength: 16
    },
    path: {
        type: String,
        unique: true,
        maxlength: 255
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