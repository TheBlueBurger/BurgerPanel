import { ServerPermissions } from "./Permission";
import { ServerRole } from "./Role";

export interface Server {
    _id: string;
    name: string;
    path: string;
    mem: number;
    allowedUsers: {
        user: string;
        permissions: ServerPermissions[];
        roles: ServerRole[];
    }[];
    version: string;
    software: "vanilla" | "purpur" | "paper";
    port: number;
    autoStart: boolean;
    autoRestart: boolean;
}

export const allowedSoftwares = ["purpur", "paper", "vanilla"];

export type ServerStatuses = {
    [id: string]: {
        status: "running" | "stopped" | "unknown";
    }
}
// allowed mime types from file editor
export const allowedMimeTypes = ["text/plain", "application/json", "text/yaml"];
// bypassed mime type blocks, direct paths
export const allowedFileNames = ["/server.properties"];