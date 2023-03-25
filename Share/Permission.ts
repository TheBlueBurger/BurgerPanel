import { User } from "./User.js";
export const _ServerPermissions = ["set.autostart", "set.port", "set.software", "set.mem", "set.name", "console.read", "console.write", "stop", "start", "delete"] as const;
export const _UserPermissions = ["create", "set.admin", "token.read", "delete", "permissions.read", "permissions.write"] as const;
export const _SettingPermissions = [`set.all`, `set`, "read"] as const;
export const _ServerPerformance = ["view", "mem", "load", "platform"] as const;
export type ServerPermissions = typeof _ServerPermissions[number];
export type UserPermissions = typeof _UserPermissions[number];
export type SettingPermissions = typeof _SettingPermissions[number];
export type ServerPerformance = typeof _ServerPerformance[number];
export type PermissionString = `servers.all.${ServerPermissions}` | `users.${UserPermissions}` | `settings.${SettingPermissions}` | `performance.${ServerPerformance}` | "full";
export const validPermissions: PermissionString[] = [
    ..._ServerPermissions.map(l => "servers.all." + l),
    ..._UserPermissions.map(l => "users." + l),
    ..._SettingPermissions.map(l => "settings." + l),
    ..._ServerPerformance.map(l => "performance." + l),
    "full"
] as PermissionString[];
// this is a mess.

// full is spooky scary dont give it to like anyone except urself
export type Permission = PermissionString | PermissionString[] | {
    all: PermissionString[]
};
export function hasPermission(user: User | undefined | null, permission: Permission): boolean {
    if(!user) return false;
    if(user.permissions.includes("full")) return true;
    if(Array.isArray(permission) && !permission.some(p => typeof p == "string")) {
        // Check if one of the permissions match
        return permission.some(p => hasPermission(user, p));
    }
    if(typeof permission == "string" && user.permissions.includes(permission)) return true;
    // It has to be the object
    if(typeof permission == "object" && !Array.isArray(permission) && Array.isArray(permission.all)) { // Just in case
        if(permission.all.length == 0) return false;
        return !permission.all.some(p => !hasPermission(user, p)); 
    }
    return false;
}

export function isValidPermissionString(permissionString: string | PermissionString): permissionString is PermissionString {
    return validPermissions.includes(permissionString as any);
}