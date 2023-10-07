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
type exports = {
    serverManager: typeof import("./serverManager.js"),
    logger: typeof import("./logger.js"),
    index: typeof import("./index.js"),
    db: typeof import("./db.js"),
    config: typeof import("./config.js")
}
export class PluginEssentials {
    name: string;
    constructor(name: string) {
        this.name = name;
    }
    // TODO: is there a better way to do this?
    getExports<T extends keyof exports>(name: T): Promise<exports[T]> {
        switch(name) {
            // @ts-ignore
            case "serverManager": return import("./serverManager.js")
            // @ts-ignore
            case "logger": return import("./logger.js")
            // @ts-ignore
            case "index": return import("./index.js")
            // @ts-ignore
            case "db": return import("./db.js")
            // @ts-ignore
            case "config": return import("./config.js")
            default: throw new Error("invalid export")
        }
    }
    get mixinHandler() {
        return mixinHandler;
    }
}

export default new class PluginManager {
    plugins: any[] = [];
    constructor() {
    }
    async init() {
        if(!await exists(__dirname + "/plugins")) return;
        let files = await fs.readdir(__dirname + "/plugins");
        for await(let file of files) {
            let fullPath = path.join(__dirname, "plugins", file);
            if(!file.endsWith(".js")) return;
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