import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../../../Share/Permission.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";

export default class KillServer extends Packet {
    name: Request = "killServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"killServer"> {
        let server = await servers.findById(data.id);
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            return "Not found"
        }
        if(!hasServerPermission(client.data.auth.user, server.toJSON(), "kill")) {
            return "You cant kill this server";
        }
        logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is killing ${server.name} (${server._id})`, "server.kill", LogLevel.WARNING);
        await serverManager.killServer(server?.toJSON());
    }
}
