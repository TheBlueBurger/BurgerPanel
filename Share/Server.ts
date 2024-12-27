import { ServerPermissions } from "./Permission";
export const allowedSoftwares = ["purpur", "paper", "vanilla", "fabric"] as const;
export type AllowedSoftware = typeof allowedSoftwares[number];
export interface Server {
    id: number;
    name: string;
    path: string;
    memory: number;
    version: string;
    software: AllowedSoftware;
    port: number;
    autostart: boolean;
    autorestart: boolean;
    jvmArgs: string;
}

export type ServerStatus = "running" | "stopping" | "stopped" | "unknown";
export type ServerStatuses = {
    [id: string]: {
        status: ServerStatus;
    }
}
// allowed mime types from file editor
export const allowedExtensions = ["txt", "json", "yml", "yaml", "toml"];
// bypassed mime type blocks, direct paths
export const allowedFileNames = ["/server.properties"];