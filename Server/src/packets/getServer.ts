import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasPermission, hasServerPermission } from "../../../Share/Permission.js";

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
                emits: ["getServer-" + data.id]
            });
            return;
        }
        let status = hasServerPermission(client.data.auth.user, server.toJSON(), "status") && serverManager.getStatus(server.toJSON());
        client.json({
            type: "getServer",
            success: true,
            server,
            emits: ["getServer-" + data.id],
            status
        });
    }
}