import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";

export default class AttachToServer extends Packet {
    name: string = "attachToServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        let server = await servers.findById(data._id).exec();
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            client.json({
                type: "attachToServer",
                success: false,
                message: "Server not found",
                emitEvent: true,
                emits: ["server-attached-" + data._id]
            });
            return;
        }
        let resp = serverManager.attachClientToServer(client, server.toJSON());
        client.json({
            type: "attachToServer",
            success: true,
            server,
            emitEvent: true,
            emits: ["server-attached-" + data._id],
            lastLogs: resp.lastLogs
        });
    }
}