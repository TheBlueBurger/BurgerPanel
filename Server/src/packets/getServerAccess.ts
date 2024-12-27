import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import serverManager from "../serverManager.js";
import { Request } from "../../../Share/Requests.js";
import { hasServerPermission, userHasAccessToServer } from "../util/permission.js";
import db, { getServerByID } from "../db.js";
import { hasPermission } from "../../../Share/Permission.js";

export default class GetServerAccess extends Packet {
    name: Request = "getServerAccess";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"getServerAccess"> {
        if (!data.id) return;
        let server = getServerByID.get(data.id);
        if (!server || !userHasAccessToServer(client.data.auth.user, server)) {
            return "Server not found";
        }
        if(!hasPermission(client.data.auth.user, "users.view")) return "No user access!";
        if(data.uid) {
            const userAccess = db.prepare("SELECT users.username, users.id, user_server_access.permissions FROM users INNER JOIN user_server_access ON users.id = user_server_access.user_id WHERE user_server_access.server_id = ? AND user_server_access.user_id = ? LIMIT 1").get(server.id, data.uid);
            if(!userAccess) return "User doesnt have access!";
            return {users: [userAccess as any]}
        }
        const users = db.prepare("SELECT users.username, users.id, user_server_access.permissions FROM users INNER JOIN user_server_access ON users.id = user_server_access.user_id WHERE user_server_access.server_id = ?").all(server.id) as {username: string, id: number, permissions: string}[];

        return {
            users: users.map(user => ({...user, permissions: JSON.parse(user.permissions)}))
        }
    }
}