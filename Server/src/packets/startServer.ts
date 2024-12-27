import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { getServerByID } from "../db.js";
import serverManager from "../serverManager.js";
import { hasServerPermission, userHasAccessToServer } from "../util/permission.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";

export default class StartServer extends Packet {
    name: Request = "startServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"startServer"> {
        let server = getServerByID.get(data.id);
        if (!server || !userHasAccessToServer(client.data.auth.user, server)) {
            return "Server not found";
        }
        if(!hasServerPermission(client.data.auth.user, server, "start")) {
            return "Not allowed";
        }
        if(serverManager.serverIsRunning(server)) return "Already running!";
        logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.id}) is starting ${server.name} (${server.id})`, "server.start", LogLevel.INFO);
        await serverManager.startServer(server);
        return;
    }
}