import { User } from "../../../Share/User.js";
import type { Permission, ServerPermissions } from "../../../Share/Permission.js";
import { hasPermission, hasServerPermission as _hasServerPermission } from "../../../Share/Permission.js";
import { Server } from "../../../Share/Server.js";

export default function _hasPermission(user: User | undefined, permission: Permission): boolean {
    return hasPermission(user, permission)
}
export function hasServerPermission(user: User | undefined, server: Server, permission: ServerPermissions) {
    return _hasServerPermission(user, server, permission);
}