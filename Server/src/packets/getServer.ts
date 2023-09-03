import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasPermission, hasServerPermission } from "../../../Share/Permission.js";
import { Request } from "../../../Share/Requests.js";

export default class GetServer extends Packet {
    name: Request = "getServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"getServer"> {
        if (!data.id) return;
        let server = await servers.findById(data.id);
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            return "Server not found";
        }
        let status = hasServerPermission(client.data.auth.user, server.toJSON(), "status") && serverManager.getStatus(server.toJSON());
        return {
            server: server.toJSON(),
            status: status || undefined
        }
    }
}