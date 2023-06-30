import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../util/permission.js";
import { Request } from "../../../Share/Requests.js";
import logger, { LogLevel } from "../logger.js";

export default class DeleteServer extends Packet {
    name: Request = "deleteServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"deleteServer"> {
        if(!client.data.auth.user) return;
        // Ensure the server exists
        let server = await servers.findById(data.id).exec();
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            return "Server does not exist"
        }
        if(!hasServerPermission(client.data.auth.user, server.toJSON(), "delete")) {
            return "No permission"
        }
        logger.log(`${client.data.auth.user.username} deleted ${server.name}`, "server.delete", LogLevel.WARNING);
        await server.deleteOne();
        await serverManager.stopServer(server.toJSON());
        serverManager.deleteServerFromCache(server.toJSON());
    }
}