import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import type { DeleteServerS2C } from "../../../Share/DeleteServer.js"
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../util/permission.js";

export default class DeleteServer extends Packet {
    name: string = "deleteServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        if(!client.data.auth.user) return;
        // Ensure the server exists
        let server = await servers.findById(data.id).exec();
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            this.respond(client, {
                type: "deleteServer",
                success: false,
                message: "Server does not exist",
                emits: ["server-deleted-" + data.id]
            });
            return;
        }
        if(!hasServerPermission(client.data.auth.user, server.toJSON(), "delete")) {
            this.respond(client, {
                type: "deleteServer",
                success: false,
                message: "No permission",
                emits: ["server-deleted-" + data.id]
            });
        }
        await server.deleteOne();
        await serverManager.stopServer(server.toJSON());
        this.respond(client, {
            type: "deleteServer",
            success: true,
            serverName: server.name,
            emits: ["server-deleted-" + data.id]
        });
        serverManager.deleteServerFromCache(server.toJSON());
    }
    respond(client: OurClient, data: DeleteServerS2C) {
        client.json(data);
    }
}