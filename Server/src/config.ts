var forcedChangeConfig: (keyof Config)[] = ["serverPath"];
var cachedSettings: { [key in keyof Config]?: string | number } = {};
import { defaultConfig, Config, ConfigValue } from "../../Share/Config.js";
import path from "node:path";
import fs from "node:fs/promises";
import { isValidPermissionString } from '../../Share/Permission.js';
import { settings } from './db.js';
import { IDs } from '../../Share/Logging.js';
import { exists } from "./util/exists.js";
import { type AllowedSoftware, allowedSoftwares } from "../../Share/Server.js";
import isValidMCVersion from "./util/isValidMCVersion.js";
export async function getSetting(key: keyof typeof defaultConfig, ignoreForcedChangeConfig?: boolean, errorIfNotSet?: boolean): Promise<ConfigValue> {
    let cachedSetting = cachedSettings[key];
    if (typeof cachedSetting != "undefined" && !errorIfNotSet) {
        return cachedSetting;
    }
    let databaseOption = await settings.findOne({ key });
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
        // if (!value.match(/^[a-zA-Z0-9_\-\/\\:]+$/)) throw new Error("Server path is invalid.");
        newPath = path.normalize(value);
        if (!path.isAbsolute(newPath)) throw new Error("Server path is not absolute.");
        // Ensure the folder exists, but is empty
        if (!(await (await fs.stat(newPath)).isDirectory())) {
            throw new Error("Server path is not a directory: " + newPath);
        }
        if (await (await fs.readdir(newPath)).length != 0) {
            throw new Error("Server path is not empty: " + newPath);
        }
        return path.normalize(newPath);
    },
    defaultPermissions: async(value) => {
        let permissions = value.split(",");
        permissions.forEach(p => {
            if(!isValidPermissionString(p)) throw new Error("Invalid permission: " + p);
        })
        return true;
    },
    defaultMCSoftware: async(val) => {
        if(!allowedSoftwares.includes(val as AllowedSoftware)) throw new Error("Invalid software");
        return true;
    },
    logging_DisabledIDs: async(val) => {
        if(val === "") return true;
        let splitVal = val.split(",");
        let newVal: IDs[] = [];
        splitVal.forEach(v => {
            if(IDs.includes(v as IDs)) newVal.push(v as IDs);
        });
        return newVal.join(",");
    },
    logging_DiscordWebHookURL: async(val) => {
        return /http(s)?:\/\/.+\..+/.test(val) || val == "disabled";
    },
    logging_logDir: async(val) => {
        return (path.isAbsolute(val) && await exists(val) && (await fs.stat(val)).isDirectory()) || val == "disabled";
    },
    defaultMCVersion: async(val) => {
        return await isValidMCVersion(val);
    },
    webServerPort: async(val) => {
        let valNum = Number(val);
        return valNum < 65536 && valNum >= 0 && !isNaN(valNum)
    },
    defaultMemory: async(val) => {
        let valNum = Number(val);
        return valNum >= 0 && !isNaN(valNum)
    },
    bypassFileTypeLimitations: boolValidator,
}
export function isValidKey(key: string | undefined): key is keyof Config {
    if(typeof key != "string") return false;
    return key in defaultConfig;
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
    await settings.upsert({key}, {value: value.toString()});
    cachedSettings[key] = value;
    return value;
}
export async function getAllSettings(): Promise<{[key in keyof Config]: ConfigValue}> {
    let result: { [key in keyof Config]?: ConfigValue } = {};
    for (let key in defaultConfig) {
        result[key as keyof Config] = await getSetting(key as keyof Config, true);
    }
    return result as {[key in keyof Config]: ConfigValue};
}