import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { getServerByID } from "../db.js";
import serverManager from "../serverManager.js";
import { hasServerPermission, userHasAccessToServer } from "../util/permission.js";
import logger from "../logger.js";
import { Request } from "../../../Share/Requests.js";

export default class WriteToConsole extends Packet {
    name: Request = "writeToConsole";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"writeToConsole"> {
        let server = getServerByID.get(data.id);
        if (!server || !userHasAccessToServer(client.data.auth.user, server)) {
            return "Server not found!";
        }
        if(hasServerPermission(client.data.auth.user, server, "console.write")) {
            if (typeof data.command != "string" || data.command.length > 1000 || data.command.length < 1) return;
            if(!serverManager.serverIsRunning(server)) return "Server isn't running!";
            logger.log(`${client.data.auth.user?.username} wrote to console of ${server.name}: ${data.command}`, "server.console.write");
            serverManager.writeToConsole(server, data.command, client.data.auth.user);
        } else {
            return "You do not have permission to write in the console of this server.";
        }
    }
}