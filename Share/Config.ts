export let defaultConfig: Config = {
    defaultMemory: 1024,
    webServerPort: 3001,
    serverPath: "",
    serverPathIsRelative: 1,
    defaultMCVersion: "1.19.3",
    defaultMCSoftware: "paper",
    stopServerTimeout: 120_000 // 2 mins
}
export interface Config {
    defaultMemory: number;
    webServerPort: number;
    serverPath: string | null;
    serverPathIsRelative: number;
    defaultMCVersion: string;
    defaultMCSoftware: "purpur" | "paper" | "vanilla";
    stopServerTimeout: number;
}
export let descriptions: {[key in keyof Config]: string} = {
    defaultMemory: "The default amount of memory to allocate to a server",
    webServerPort: "The port to run the web server on.\nNote: If you change this, you need to restart the web server.",
    serverPath: "The path to store servers in",
    serverPathIsRelative: "Whether the server path is relative to the web server or absolute\nNote: If you change this, you need to change the server path as well. It will be automatically reset.",
    defaultMCVersion: "The default Minecraft version to use when creating a server.",
    defaultMCSoftware: "The default Minecraft software to use when creating a server. Can be either 'purpur', 'paper', or 'vanilla'.",
    stopServerTimeout: "The amount of time in milliseconds to wait for a server to stop before killing it."
}
// Array of keys that are allowed to be read by all users
export let allUsersAllowedToRead: (keyof Config)[] = [];