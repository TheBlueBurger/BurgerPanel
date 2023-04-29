import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import { Permission, hasPermission, hasServerPermission } from "../../../Share/Permission.js";
import serverManager from "../serverManager.js";
import { ServerStatuses } from "../../../Share/Server.js";

export default class GetAllServers extends Packet {
    name: string = "getAllServers";
    requiresAuth: boolean = true;
    permission: Permission = "servers.all.view";
    async handle(client: OurClient, data: any) {
        let serverList = await servers.find({}, {}, { limit: Infinity }).exec();
        let statuses = {} as ServerStatuses;
        serverList.forEach(server => {
            statuses[server._id.toHexString()] = {
                status: hasServerPermission(client.data.auth.user, server.toJSON(), "status") ? serverManager.getStatus(server.toJSON()) : "unknown"
            }
        });
        client.json({
            type: "getAllServers",
            success: true,
            servers: serverList,
            statuses
        });
    }
}
