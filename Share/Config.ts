import { AllowedSoftware, allowedSoftwares } from "./Server.js";

export let defaultConfig: Config = {
    defaultMemory: 1024,
    webServerPort: 3001,
    serverPath: "",
    defaultMCVersion: "1.21.4",
    defaultMCSoftware: "paper",
    stopServerTimeout: 120_000, // 2 mins
    defaultPermissions: "performance.view,performance.mem,performance.load,performance.platform", // thats how the database works and im too lazy to change
    logging_DiscordWebHookURL: "",
    logging_DisabledIDs: "packet.invalid-packet",
    logging_logDir: "",
    bypassFileTypeLimitations: 0
}
export interface Config {
    defaultMemory: number;
    webServerPort: number;
    serverPath: string;
    defaultMCVersion: string;
    defaultMCSoftware: AllowedSoftware;
    stopServerTimeout: number;
    defaultPermissions: string;
    logging_DisabledIDs: string; // comma-separated IDs
    logging_DiscordWebHookURL: string;
    logging_logDir: string;
    bypassFileTypeLimitations: number;
}
export let descriptions: { [key in keyof Config]?: string } = {
    defaultMemory: "The default amount of memory to allocate to a server",
    webServerPort: "The port to run the web server on.\nNote: If you change this, you need to restart the web server.",
    serverPath: "The path to store servers in",
    defaultMCVersion: "The default Minecraft version to use when creating a server.",
    defaultMCSoftware: `The default Minecraft software to use when creating a server. Can be either ${allowedSoftwares.join(", ")}.`,
    stopServerTimeout: "The amount of time in milliseconds to wait for a server to stop before killing it.",
    defaultPermissions: "The permission to give a new user, separated by commas",
    bypassFileTypeLimitations: "If enabled will allow all file types to be edited in the editor"
}
export let disabledEditingFrontend: string[] = ["logging_"]; // if it starts with this, it will be ignored on the frontend settings page and the server will deny a request to update it
// Array of keys that are allowed to be read by all users
export let allUsersAllowedToRead: (keyof Config)[] = [];
export type ConfigValue = string | number;
