import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../util/permission.js";
import logger, { LogLevel } from "../logger.js";

export default class StartServer extends Packet {
    name: string = "startServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        let server = await servers.findById(data.id).exec();
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            client.json({
                type: "startServer",
                success: false,
                message: "Server not found",
                emits: ["server-started-" + data.id]
            });
            return;
        }
        if(!hasServerPermission(client.data.auth.user, server.toJSON(), "start")) {
            client.json({
                type: "startServer",
                success: false,
                message: "Not allowed",
                emits: ["server-started-" + data.id]
            });
            return;
        }
        logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is starting ${server.name} (${server._id})`, "server.start", LogLevel.INFO);
        await serverManager.setupServer(server?.toJSON()); // set the server up if it isnt already set up
        await serverManager.startServer(server?.toJSON());
        client.json({
            type: "startServer",
            success: true,
            server,
            emits: ["server-started-" + data.id]
        });
    }
}