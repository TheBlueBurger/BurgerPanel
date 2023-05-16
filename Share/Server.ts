import { ServerPermissions } from "./Permission";

export interface Server {
    _id: string;
    name: string;
    path: string;
    mem: number;
    allowedUsers: {
        user: string;
        permissions: ServerPermissions[];
    }[];
    version: string;
    software: "vanilla" | "purpur" | "paper";
    port: number;
    autoStart: boolean;
    autoRestart: boolean;
}

export const allowedSoftwares = ["purpur", "paper", "vanilla"];
export type ServerStatus = "running" | "stopped" | "unknown";
export type ServerStatuses = {
    [id: string]: {
        status: ServerStatus;
    }
}
// allowed mime types from file editor
export const allowedMimeTypes = ["text/plain", "application/json", "text/yaml"];
// bypassed mime type blocks, direct paths
export const allowedFileNames = ["/server.properties"];