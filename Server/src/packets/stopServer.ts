import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../../../Share/Permission.js";
import logger, { LogLevel } from "../logger.js";

export default class StopServer extends Packet {
    name: string = "stopServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        let server = await servers.findById(data.id).exec();
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            client.json({
                type: "stopServer",
                success: false,
                message: "Server not found",
                emits: ["server-stopping-" + data.id]
            });
            return;
        }
        if(!hasServerPermission(client.data.auth.user, server.toJSON(), "stop")) {
            client.json({
                type: "stopServer",
                success: false,
                message: "You cannot stop this server.",
                emits: ["server-stopping-" + data.id]
            });
            return;
        }
        logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is stopping ${server.name} (${server._id})`, "server.stop", LogLevel.INFO);
        await serverManager.stopServer(server?.toJSON());
        client.json({
            type: "stopServer",
            success: true,
            server,
            emits: ["server-stopping-" + data.id]
        });
    }
}