import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import serverManager from "../serverManager.js";
import { Request } from "../../../Share/Requests.js";
import { hasServerPermission, userHasAccessToServer } from "../util/permission.js";
import { getServerByID } from "../db.js";

export default class GetServer extends Packet {
    name: Request = "getServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"getServer"> {
        if (!data.id) return;
        let server = getServerByID.get(data.id);
        if (!server || !userHasAccessToServer(client.data.auth.user, server)) {
            return "Server not found";
        }
        let status = hasServerPermission(client.data.auth.user, server, "status") && serverManager.getStatus(server);
        return {
            server: server,
            status: status || undefined
        }
    }
}