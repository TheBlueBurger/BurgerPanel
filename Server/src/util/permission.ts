import { User } from "../../../Share/User.js";
import type { Permission, ServerPermissions } from "../../../Share/Permission.js";
import { hasPermission } from "../../../Share/Permission.js";
import { Server } from "../../../Share/Server.js";

export default function _hasPermission(user: User | undefined, permission: Permission): boolean {
    return hasPermission(user, permission)
}
export function hasServerPermission(user: User, server: Server, permission: ServerPermissions) {
    return hasPermission(user, `servers.all.${permission}`);
    // TODO: Permissions for each server
}