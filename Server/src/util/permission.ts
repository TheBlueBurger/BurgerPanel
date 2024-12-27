import { User } from "../../../Share/User.js";
import type { Permission, ServerPermissions } from "../../../Share/Permission.js";
import { hasPermission, hasServerPermission as _hasServerPermission } from "../../../Share/Permission.js";
import { Server } from "../../../Share/Server.js";
import db, { getServerPermissions_UID_SID, getUserByID } from "../db.js";

export default function _hasPermission(user: User | undefined, permission: Permission): boolean {
    return hasPermission(user, permission)
}

export function getServerPermissions(user: User | number | undefined, server: Server | number | undefined): string[] | undefined {
    if(typeof user == "undefined") return undefined;
    if(typeof server == "undefined") return undefined;
    const uid = typeof user == "number" ? user : user.id;
    const sid = typeof server == "number" ? server : server.id;
    const data = getServerPermissions_UID_SID.get(uid, sid);
    if(!data) return undefined;
    try {
        return JSON.parse(data.permissions);
    } catch(err) {
        throw new Error(`Could not parse user ${uid} permissions for ${sid}: ${err}. The database is corrupt! Contact an administrator.`);
    }
}

export function userHasAccessToServer(user: User | number | undefined, server: Server | number | undefined) {
    if(typeof user == "undefined" || typeof server == "undefined") return false;
    const uid = typeof user == "number" ? user : user.id;
    const sid = typeof server == "number" ? server : server.id;
    const data = getServerPermissions_UID_SID.get(uid, sid);
    if(data != null) return true;
    let userData: User | undefined = undefined;
    if(typeof user == "number") userData = getUserByID.get(uid);
    else userData = user;
    if(!userData) throw new Error("cant get userdata in userHasAccessToServer");
    if(hasPermission(userData, "servers.all.view")) return true;
    return false;
}

export function hasServerPermission(user: User | undefined, server: Server | number, permission: ServerPermissions, cachedPermissions?: string[]) {
    if(!user) return false;
    
    // Firstly check if user has that permission for all servers to avoid useless database queries
    if(hasPermission(user, `server.all.${permission}`)) return true;

    // Check if user has the permission in the server instead
    const serverPermissions = typeof cachedPermissions == "undefined" ? getServerPermissions(user, server) : cachedPermissions;
    if(typeof serverPermissions == "undefined") return false;
    if(serverPermissions.includes(permission)) return true;
    if(serverPermissions.includes("full")) return true;
    
    // User doesnt have the permission
    return false;
}