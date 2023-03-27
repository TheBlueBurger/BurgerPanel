import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../../../Share/Permission.js";

export default class GetServer extends Packet {
    name: string = "getServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        if (!data.id) return;
        let server = await servers.findById(data.id).exec();
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            client.json({
                type: "getServer",
                success: false,
                message: "Server not found",
                emitEvent: true,
                emits: ["getServer-" + data.id]
            });
            return;
        }
        let status;
        if(data.requestStatus && hasServerPermission(client.data.auth.user, server.toJSON(), "status")) {
            if(serverManager.servers[server._id.toString()]?.childProcess) status = "running";
            else status = "stopped";
            client.json({
                type: "serverStatusUpdate",
                emitEvent: true,
                emits: ["serverStatusUpdate-" + server._id.toString()],
                status
            });
        }
        client.json({
            type: "getServer",
            success: true,
            server,
            emitEvent: true,
            emits: ["getServer-" + data.id],
            status
        });
    }
}