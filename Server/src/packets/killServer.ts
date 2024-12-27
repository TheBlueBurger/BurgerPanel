import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { getServerByID } from "../db.js";
import serverManager from "../serverManager.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";
import { hasServerPermission, userHasAccessToServer } from "../util/permission.js";

export default class KillServer extends Packet {
    name: Request = "killServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"killServer"> {
        let server = getServerByID.get(data.id);
        if (!server || !userHasAccessToServer(client.data.auth.user, server)) {
            return "Not found"
        }
        if(!hasServerPermission(client.data.auth.user, server, "kill")) {
            return "You cant kill this server";
        }
        logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.id}) is killing ${server.name} (${server.id})`, "server.kill", LogLevel.WARNING);
        serverManager.killServer(server);
    }
}
