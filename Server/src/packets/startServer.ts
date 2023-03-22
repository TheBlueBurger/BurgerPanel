import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";

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
                emitEvent: true,
                emits: ["server-started-" + data.id]
            });
            return;
        }
        console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is starting ${server.name} (${server._id})`);
        await serverManager.setupServer(server?.toJSON()); // set the server up if it isnt already set up
        await serverManager.startServer(server?.toJSON());
        client.json({
            type: "startServer",
            success: true,
            server,
            emitEvent: true,
            emits: ["server-started-" + data.id]
        });
    }
}