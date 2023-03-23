import { User } from "../../../Share/User";
import type { Permission } from "../../../Share/Permission";

export default function hasPermission(user: User | undefined, permission: Permission): boolean {
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
