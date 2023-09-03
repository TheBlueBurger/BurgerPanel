import { OurClient, Packet, ServerPacketResponse, isProd } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../util/permission.js";
import { Request } from "../../../Share/Requests.js";

export default class AttachToServer extends Packet {
    name: Request = "attachToServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"attachToServer"> {
        let server = await servers.findById(data._id);
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            return "Server not found";
        }
        let status = hasServerPermission(client.data.auth.user, server.toJSON(), "status") ? serverManager.getStatus(server.toJSON()) : "unknown";
        let resp = serverManager.attachClientToServer(client, server.toJSON());
        return {
            server: server.toJSON(),
            lastLogs: hasServerPermission(client.data.auth.user, server.toJSON(), "console.read") ? resp.lastLogs : [],
            status
        }
    }
}