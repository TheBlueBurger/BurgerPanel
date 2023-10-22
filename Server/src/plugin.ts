import fs from "node:fs/promises";
import { exists } from "./util/exists.js";
import url from "node:url";
import path from "node:path";
import logger, { LogLevel } from "./logger.js";
let __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export const mixinHandler = new class {
    handlers: {
        [mixinName: string]: ((data: any) => Promise<boolean | void>)[]
    } = {};
    constructor() {

    }
    addHandler(name: string, handler: (data: any) => Promise<boolean | void>) {
        if(typeof this.handlers[name] == "undefined") this.handlers[name] = [];
        this.handlers[name].push(handler);
    }
    async handle(name: string, data: any) {
        if(typeof this.handlers[name] == "undefined") return false;
        let cancelled = false;
        for await(let handler of this.handlers[name]) {
            if(await handler(data) === true) cancelled = true;
        }
        return cancelled;
    }
}

export class PluginEssentials {
    name: string;
    constructor(name: string) {
        this.name = name;
    }
    getExports(name: string) {
        switch(name) {
            case "serverManager": return import("./serverManager.js")
            case "logger": return import("./logger.js")
            case "index": return import("./index.js")
            case "db": return import("./db.js")
            case "config": return import("./config.js")
            default: throw new Error("invalid export")
        }
    }
    get mixinHandler() {
        return mixinHandler;
    }
    // path is relative from /plugins
    // can only include one file, if you need more use esbuild/rollup/whatever
    async addFrontendPlugin(path: string) {
        let fileData = await fs.readFile(__dirname + "/plugins/" + path);
        pluginManager.frontendPlugins.push(fileData.toString());
    }
}

const pluginManager = new class {
    plugins: any[] = [];
    frontendPlugins = [] as string[];
    constructor() {
    }
    async init() {
        if(!await exists(__dirname + "/plugins")) return;
        let files = await fs.readdir(__dirname + "/plugins");
        for await(let file of files) {
            let fullPath = path.join(__dirname, "plugins", file);
            if(!file.endsWith(".js") && !file.endsWith(".mjs")) return;
            if(file.includes(".web.")) return;
            let stat = await fs.stat(fullPath);
            if(!stat.isFile()) return;
            let imported = await import(fullPath);
            if(!imported?.default) throw new Error(`Invalid plugin ${file} doesnt provide default export`);
            let instance = new imported.default(new PluginEssentials(file));
            this.plugins.push(instance);
            logger.log(`Loaded ${file}`, "debug", LogLevel.DEBUG);
        }
    }
}

export default pluginManager