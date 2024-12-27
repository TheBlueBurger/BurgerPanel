import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { getServerByID } from "../db.js";
import serverManager from "../serverManager.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";
import { hasServerPermission, userHasAccessToServer } from "../util/permission.js";

export default class StopServer extends Packet {
    name: Request = "stopServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"stopServer"> {
        let server = getServerByID.get(data.id);
        if (!server || !userHasAccessToServer(client.data.auth.user, server)) {
            return "Server not found";
        }
        if(!hasServerPermission(client.data.auth.user, server, "stop")) {
            return "You don't have permission to stop this server!";
        }
        if(["stopped", "stopping"].includes(serverManager.getStatus(server))) return "Already stopped/stopping!";
        logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.id}) is stopping ${server.name} (${server.id})`, "server.stop", LogLevel.INFO);
        await serverManager.stopServer(server);
    }
}