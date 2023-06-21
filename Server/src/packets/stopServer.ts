import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../../../Share/Permission.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";

export default class StopServer extends Packet {
    name: Request = "stopServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"stopServer"> {
        let server = await servers.findById(data.id).exec();
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            return "Server not found";
        }
        if(!hasServerPermission(client.data.auth.user, server.toJSON(), "stop")) {
            return "You don't have permission to stop this server!";
        }
        if(["stopped", "stopping"].includes(serverManager.getStatus(server.toJSON()))) return "Already stopped/stopping!";
        logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is stopping ${server.name} (${server._id})`, "server.stop", LogLevel.INFO);
        await serverManager.stopServer(server?.toJSON());
    }
}