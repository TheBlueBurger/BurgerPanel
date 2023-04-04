import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../util/permission.js";
import logger from "../logger.js";

export default class WriteToConsole extends Packet {
    name: string = "writeToConsole";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        let server = await servers.findById(data.id).exec();
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            client.json({
                type: "writeToConsole",
                success: false,
                message: "Server not found",
                emitEvent: true,
                emits: ["writeToServer-" + data.id]
            });
            return;
        }
        if(hasServerPermission(client.data.auth.user, server.toJSON(), "console.write")) {
            if (typeof data.command != "string" || data.command.length > 1000 || data.command.length < 1) return;
            logger.log(`${client.data.auth.user?.username} wrote to console of ${server.name}: ${data.command}`, "server.console.write");
            serverManager.writeToConsole(server.toJSON(), data.command, client.data.auth.user);
        } else {
            client.json({
                type: "writeToConsole",
                success: false,
                message: "You do not have permission to write in the console of this server.",
                emitEvent: true,
                emits: ["writeToServer-" + data.id]
            });
        }
    }
}