import { settings } from './db.js';
import { defaultConfig, Config } from "../../Share/Config.js";
import path from "node:path";
import fs from "node:fs/promises";
import { isValidPermissionString } from '../../Share/Permission.js';

let forcedChangeConfig: (keyof Config)[] = ["serverPath"];
let cachedSettings: { [key in keyof Config]?: string | number | null } = {};
export async function getSetting(key: keyof typeof defaultConfig, ignoreForcedChangeConfig?: boolean, errorIfNotSet?: boolean) {
    if (key in cachedSettings && !errorIfNotSet) {
        return cachedSettings[key];
    }
    let databaseOption = await settings.findOne({ key }).exec();
    if (!databaseOption?.value) {
        if (errorIfNotSet) throw new Error(key + " must be set in the settings!");
        if (forcedChangeConfig.includes(key) && !ignoreForcedChangeConfig) throw new Error(key + " must be set in the settings!");
        if (!(key in defaultConfig)) throw new Error("Invalid config key");
        cachedSettings[key] = defaultConfig[key as keyof typeof defaultConfig];
        return defaultConfig[key as keyof typeof defaultConfig];
    }
    if (typeof defaultConfig[key] == "number") {
        cachedSettings[key] = parseInt(databaseOption.value);
        return parseInt(databaseOption.value);
    }
    cachedSettings[key] = databaseOption.value;
    return databaseOption.value;
}
let boolValidator: ((v: string) => Promise<string>) = async (value: string) => {
    if (["true", "1", "yes"].includes(value.toLowerCase())) return "1";
    if (["false", "0", "no"].includes(value)) return "0";
    throw new Error("Invalid boolean value");
}
/*
This will be used to validate settings when they are set.
If it returns true, it succeeds.
If it returns a string, it will be changed to that string.
If it returns an error, it will fail.
*/
let validators: { [key in keyof Config]?: (value: string) => Promise<boolean | string> } = {
    serverPath: async (value) => {
        if (!value) throw new Error("Server path cannot be empty");
        let newPath = path.normalize(value);
        if (await getSetting("serverPathIsRelative")) {
            if (!value.match(/^[a-zA-Z0-9_]+$/)) throw new Error("Server path is invalid.");
            newPath = path.join(process.cwd(), value);
        } else {
            if (!value.match(/^[a-zA-Z0-9_\-\/\\:]+$/)) throw new Error("Server path is invalid.");
            newPath = path.normalize(value);
            if (!path.isAbsolute(newPath)) throw new Error("Server path is not absolute.");
        }
        // Ensure the folder exists, but is empty
        if (!(await (await fs.stat(newPath)).isDirectory())) {
            throw new Error("Server path is not a directory: " + newPath);
        }
        if (await (await fs.readdir(newPath)).length != 0) {
            throw new Error("Server path is not empty: " + newPath);
        }
        return path.normalize(newPath);
    },
    serverPathIsRelative: boolValidator,
    defaultPermissions: async(value) => {
        let permissions = value.split(",");
        permissions.forEach(p => {
            if(!isValidPermissionString(p)) throw new Error("Invalid permission: " + p);
        })
        return true;
    }
}
export async function setSetting<K extends keyof Config>(key: K, value: Config[K] extends number ? number : string) {
    // Ensure the key is valid
    if (!(key in defaultConfig)) throw new Error("Invalid config key");
    // Ensure the value is valid
    try {
        let validator = validators[key as keyof Config];
        if (validator) {
            let result = await validator(value as string);
            if (typeof result == "string") value = result as any;
            else if (typeof result == "boolean" && !result) throw new Error("Invalid value");
        }
    } catch (error) {
        throw new Error("Invalid value: '" + value + "' for key '" + key + "': " + (error as any)?.message);
        return; // just in case
    }
    if (typeof value == "string" && typeof defaultConfig[key as keyof typeof defaultConfig] == "number") {
        value = parseInt(value) as any;
        if (Number.isNaN(value)) throw new Error("Invalid value. Expected number but got NaN");
    }
    if (typeof value !== typeof defaultConfig[key as keyof typeof defaultConfig]) throw new Error("Invalid config value. Expected " + typeof defaultConfig[key as keyof typeof defaultConfig] + " but got " + typeof value);
    // Set it in the database with upsert
    await settings.updateOne({
        key
    }, { value }, { upsert: true }).exec();
    cachedSettings[key] = value;
    return value;
}
export async function getAllSettings() {
    let result: { [key in keyof Config]?: string | number | null } = {};
    for (let key in defaultConfig) {
        result[key as keyof Config] = await getSetting(key as keyof Config, true);
    }
    return result;
}