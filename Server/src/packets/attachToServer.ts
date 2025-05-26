import { OurClient, Packet, ServerPacketResponse, isProd } from "../index.js";
import { getServerByID } from "../db.js";
import serverManager from "../serverManager.js";
import { getServerPermissions, hasServerPermission, userHasAccessToServer } from "../util/permission.js";
import { Request } from "../../../Share/Requests.js";
import { hasPermission } from "../../../Share/Permission.js";

export default class AttachToServer extends Packet {
    name: Request = "attachToServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"attachToServer"> {
        let server = getServerByID.get(data.id);
        const userPermissions = getServerPermissions(client.data.auth.user, server);
        if (!server || !(userPermissions || hasPermission(client.data.auth.user, "servers.all.view"))) {
            return "Server not found";
        }
        let status = hasServerPermission(client.data.auth.user, server, "status", userPermissions) ? serverManager.getStatus(server) : "unknown";
        const mayRead = hasServerPermission(client.data.auth.user, server, "console.read", userPermissions);
        let resp = mayRead ? serverManager.attachClientToServer(client, server) : {lastLogs:[]};
        return {
            server: server,
            lastLogs: hasServerPermission(client.data.auth.user, server, "console.read", userPermissions) ? resp.lastLogs : [],
            status
        }
    }
}