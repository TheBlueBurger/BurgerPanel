import { OurClient, Packet, ServerPacketResponse, isProd } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../util/permission.js";
import { Request } from "../../../Share/Requests.js";

export default class AttachToServer extends Packet {
    name: Request = "attachToServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"attachToServer"> {
        let server = await servers.findById(data._id).exec();
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            return "Server not found";
        }
        let status = hasServerPermission(client.data.auth.user, server.toJSON(), "status") ? serverManager.getStatus(server.toJSON()) : "unknown";
        // HACK HACK HACK HACK HACK: Make it not error on HMR
        if(serverManager.isAttachedToServer(client, server.toJSON()) && isProd) return "Already attached!";
        let resp = serverManager.attachClientToServer(client, server.toJSON());
        return {
            server: server.toJSON(),
            lastLogs: hasServerPermission(client.data.auth.user, server.toJSON(), "console.read") ? resp.lastLogs : [],
            status
        }
    }
}