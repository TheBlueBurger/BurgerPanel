import type { Config } from "./Config.js"
export type ServerPermissions = "set.autostart" | "set.port" | "set.software" | "set.mem" | "set.name" | "console.read" | "console.write" | "stop" | "start";
export type UserPermissions = "create" | "set.admin" | "token.read" | "delete" | "permissions.read" | "permissions.write";
export type SettingPermissions = `set.all` | `set.${keyof Config}` | "read";
export type PermissionString = `servers.all.${ServerPermissions}` | `users.${UserPermissions}` | `settings.${SettingPermissions}` | "full";
// full is spooky scary dont give it to like anyone except urself
export type Permission = PermissionString | PermissionString[] | {
    all: PermissionString[]
};