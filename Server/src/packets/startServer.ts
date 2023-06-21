import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../util/permission.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";

export default class StartServer extends Packet {
    name: Request = "startServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"startServer"> {
        let server = await servers.findById(data.id).exec();
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            return "Server not found";
        }
        if(!hasServerPermission(client.data.auth.user, server.toJSON(), "start")) {
            return "Not allowed";
        }
        if(serverManager.serverIsRunning(server.toJSON())) return "Already running!";
        logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is starting ${server.name} (${server._id})`, "server.start", LogLevel.INFO);
        await serverManager.startServer(server?.toJSON());
        return;
    }
}