import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../util/permission.js";

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
        if(hasServerPermission(client.data.auth.user, server.toJSON(), "console.read")) {

            let resp = serverManager.attachClientToServer(client, server.toJSON());
            client.json({
                type: "attachToServer",
                success: true,
                server,
                emitEvent: true,
                emits: ["server-attached-" + data._id],
                lastLogs: resp.lastLogs
            });
        } else {
            client.json({
                type: "attachToServer",
                success: false,
                message: "You do not have permission to attach (read logs) from this server!",
                emitEvent: true,
                emits: ["server-attached-" + data._id],
            });
        }
    }
}