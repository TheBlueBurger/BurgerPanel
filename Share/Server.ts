import { ServerPermissions } from "./Permission";

export interface Server {
    _id: string;
    name: string;
    path: string;
    mem: number;
    allowedUsers: [
        {
            user: string,
            permissions: ServerPermissions[]
        }
    ]
    version: string;
    software: "vanilla" | "purpur" | "paper";
    port: number;
    autoStart: boolean;
    autoRestart: boolean;
}

export let allowedSoftwares = ["purpur", "paper", "vanilla"];

export type ServerStatuses = {
    [id: string]: {
        status: "running" | "stopped" | "unknown";
    }
}