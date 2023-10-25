import { Request } from "../../../Share/Requests.js";
import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import logger, { LogLevel } from "../logger.js";
import serverManager from "../serverManager.js";

export default class Logout extends Packet {
    name: Request = "logout";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"logout"> {
        serverManager.detachFromAll(client);
        logger.log("User " + client.data.auth.user?.username + " logged out.", "logout", LogLevel.DEBUG);
        client.data.auth = {
            authenticated: false,
        };
        return;
    }
}