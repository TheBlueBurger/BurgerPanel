import { Server } from "./Server.js";
import { User } from "./User.js";
export const _ServerPermissions = ["set.autostart", "set.port", "set.software", "set.mem", "set.name", "set.allowedUsers.add", "set.allowedUsers.remove", "set.allowedUsers.permissions.write", "console.read", "console.write", "status", "stop", "start", "kill", "delete", "oldlogs.read", "full"] as const;
export const _ServersPermissions = [
    "create",
    "import",
    "all.view"
] as const;
export const _UserPermissions = ["create", "view", "set.admin", "token.read", "delete", "permissions.read", "permissions.write"] as const;
export const _SettingPermissions = [`set`, "read"] as const;
export const _ServerPerformance = ["view", "mem", "load", "platform"] as const;
export type ServerPermissions = typeof _ServerPermissions[number];
export type ServersPermissions = typeof _ServersPermissions[number];
export type UserPermissions = typeof _UserPermissions[number];
export type SettingPermissions = typeof _SettingPermissions[number];
export type ServerPerformance = typeof _ServerPerformance[number];
export type PermissionString = `server.all.${ServerPermissions}` | `servers.${ServersPermissions}` | `users.${UserPermissions}` | `settings.${SettingPermissions}` | `performance.${ServerPerformance}` | "full";
export const validPermissions: PermissionString[] = [
    ..._ServerPermissions.map(l => "server.all." + l),
    ..._UserPermissions.map(l => "users." + l),
    ..._SettingPermissions.map(l => "settings." + l),
    ..._ServerPerformance.map(l => "performance." + l),
    ..._ServersPermissions.map(l => "servers." + l),
    "full"
] as PermissionString[];
// this is a mess.
export const ServerProfiles: {[name:  string]: ServerPermissions[]} = {
    "basic": ["console.read", "status"],
    "trusted": ["console.read", "console.write", "status", "stop", "start", "oldlogs.read"],
    "admin": ["full"]
};

export const serverProfilesDescriptions: {[name: string]: string} = {
    basic: "Can read the console",
    trusted: "Read and write to console, start and stop and read old logs",
    admin: "Can do anything, only give it to people you really trust!"
}

// full is spooky scary dont give it to like anyone except urself
export type Permission = PermissionString | PermissionString[] | {
    all: PermissionString[]
};
export function hasPermission(user: User | undefined | null, permission: Permission): boolean {
    if(!user) return false;
    if(typeof permission == "string" && !isValidPermissionString(permission)) throw new Error("Invalid permission: " + permission);
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

export function hasServerPermission(user: User | undefined | null, server: Server, permission: ServerPermissions) {
    if(!user) return false;
    if(!_ServerPermissions.includes(permission)) throw new Error("Server permission " + permission + " doesnt exist.");
    let userEntry = server.allowedUsers.find(u => u.user == user._id.toString()); // toString just in case
    if(userEntry && (userEntry.permissions.includes(permission) || userEntry.permissions.includes("full"))) return true;
    return hasPermission(user, `server.all.${permission}`);
}
export function userHasAccessToServer(user: User | undefined, server: Server) {
    if (!user) return false;
    if(typeof user._id != "string") user._id = (user._id as string).toString(); // mongodb stupidness
    return server.allowedUsers.some(au => au.user == user._id) || hasPermission(user, "servers.all.view");
}
