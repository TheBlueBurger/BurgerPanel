import { OurClient, Packet } from "../index.js";
import { servers, users } from "../db.js";
import type { DeleteServerS2C } from "../../../Share/DeleteServer"
import serverManager from "../serverManager.js";

export default class Auth extends Packet {
    name: string = "deleteServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        // Ensure the user is an admin
        if (!client.data.auth.user?.admin) {
            this.respond(client, {
                type: "deleteServer",
                success: false,
                message: "Not authenticated",
                emitEvent: true,
                emits: ["server-deleted-" + data.id]
            });
            // Probably bad actor. Disconnect them.
            client.close();
            return;
        }
        // Ensure the server exists
        let server = await servers.findById(data.id).exec();
        if (!server) {
            this.respond(client, {
                type: "deleteServer",
                success: false,
                message: "Server does not exist",
                emitEvent: true,
                emits: ["server-deleted-" + data.id]
            });
            return;
        }
        // Delete.
        await server.deleteOne()
        await serverManager.stopServer(server.toJSON());
        this.respond(client, {
            type: "deleteServer",
            success: true,
            serverName: server.name,
            emitEvent: true,
            emits: ["server-deleted-" + data.id]
        });
        serverManager.deleteServerFromCache(server.toJSON());
    }
    respond(client: OurClient, data: DeleteServerS2C) {
        client.json(data);
    }
}