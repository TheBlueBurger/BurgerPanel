import { OurClient, Packet } from "../index.js";
import logger, { LogLevel } from "../logger.js";

export default class Logout extends Packet {
    name: string = "logout";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        logger.log("User " + client.data.auth.user?.username + " logged out.", "logout", LogLevel.DEBUG);
        client.data.auth = {
            authenticated: false,
        };
        client.json({
            type: "logout",
            success: true,
        });
    }
}