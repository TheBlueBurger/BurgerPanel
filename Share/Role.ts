import {ServerPermissions} from "./Permission"
export let roleTypes = [
    "server",
    "user"
] as const;

export type RoleType = typeof roleTypes[number];
export type Role = {
    name: string;
    type: RoleType;
    permissions: ServerPermissions[];
    inheritsFrom: string[];
    createdAt: Date;
}
export interface ServerRole extends Role {
    type: "server";
}