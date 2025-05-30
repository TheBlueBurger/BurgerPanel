import { Server } from "./Server.js";
import { User } from "./User.js";
export const _ServerPermissions = ["set.autostart", "set.autorestart", "set.port", "set.jvmArgs", "set.usejvmargs", "set.software", "set.version", "set.mem", "set.name", "set.allowedUsers.add", "set.allowedUsers.remove", "set.allowedUsers.permissions.write", "console.read", "console.write", "status", "stop", "start", "kill", "delete", "oldlogs.read", "serverfiles.read", "serverfiles.write", "serverfiles.delete", "serverfiles.upload", "serverfiles.download", "serverfiles.new", "serverfiles.rename", "plugins.download", "integrator.basic", "integrator.serverstatus", "integrator.serverstatus.players", "integrator.install", "full"] as const;
export const _ServersPermissions = ["create", "import", "all.view"] as const;
export const _UserPermissions = ["create", "view", "token.read", "token.reset", "delete", "permissions.read", "permissions.write", "password.change", "username.change.self", "username.change.all"] as const;
export const _SettingPermissions = [`set`, "read", "logging.set"] as const;
export const _ServerPerformance = ["view", "mem", "load", "platform", "playercount", "serversrunningcount"] as const;
export const _ServerInfo = ["servers.count", "clients.count"] as const;
export type ServerPermissions = typeof _ServerPermissions[number];
export type ServersPermissions = typeof _ServersPermissions[number];
export type UserPermissions = typeof _UserPermissions[number];
export type SettingPermissions = typeof _SettingPermissions[number];
export type ServerPerformance = typeof _ServerPerformance[number];
export type ServerInfo = typeof _ServerInfo[number];
export type PermissionString = `server.all.${ServerPermissions}` | `servers.${ServersPermissions}` | `users.${UserPermissions}` | `settings.${SettingPermissions}` | `performance.${ServerPerformance}` | `serverinfo.${ServerInfo}` | "full";
export const validPermissions: PermissionString[] = [
    ..._ServerPermissions.map(l => "server.all." + l),
    ..._UserPermissions.map(l => "users." + l),
    ..._SettingPermissions.map(l => "settings." + l),
    ..._ServerPerformance.map(l => "performance." + l),
    ..._ServersPermissions.map(l => "servers." + l),
    ..._ServerInfo.map(l => "serverinfo." + l),
    "full"
] as PermissionString[];
// this is a mess.
export const DefaultServerProfiles: {[name:  string]: ServerPermissions[]} = {
    "basic": ["console.read", "status"],
    "trusted": ["console.read", "console.write", "status", "stop", "start", "oldlogs.read", "serverfiles.read", "plugins.download"],
    "admin": ["full"]
};

export const serverProfilesDescriptions: {[name: string]: string} = {
    basic: "Can read the console",
    trusted: "Read and write to console, read files, start and stop and read old logs and files",
    admin: "Can do anything, only give it to people you really trust!"
};

// full is spooky scary dont give it to like anyone except urself
export type Permission = PermissionString | PermissionString[] | {
    all: PermissionString[]
};
export function hasPermission(user: User | undefined | null, permission: Permission): boolean {
    if(!user) return false;
    if(typeof permission == "string" && !isValidPermissionString(permission)) throw new Error("Invalid permission string: " + permission);
    const userPermissions = JSON.parse(user.permissions);
    if(userPermissions.includes("full")) return true;
    if(Array.isArray(permission) && !permission.some(p => typeof p == "string")) {
        // Check if one of the permissions match
        return permission.some(p => hasPermission(user, p));
    }
    if(typeof permission == "string" && userPermissions.includes(permission)) return true;
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
    throw new Error("hasServerPermission should not be ran from share");
}
