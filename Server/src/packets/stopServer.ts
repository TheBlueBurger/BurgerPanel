import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";

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
                emitEvent: true,
                emits: ["server-stopping-" + data.id]
            });
            return;
        }
        console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is stopping ${server.name} (${server._id})`);
        await serverManager.stopServer(server?.toJSON());
        client.json({
            type: "stopServer",
            success: true,
            server,
            emitEvent: true,
            emits: ["server-stopping-" + data.id]
        });
    }
}