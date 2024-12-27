import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import db from "../db.js";
import { Permission } from "../../../Share/Permission.js";
import serverManager from "../serverManager.js";
import { Server, ServerStatuses } from "../../../Share/Server.js";
import { Request } from "../../../Share/Requests.js";
import { hasServerPermission } from "../util/permission.js";

export default class GetAllServers extends Packet {
    name: Request = "getAllServers";
    requiresAuth: boolean = true;
    permission: Permission = "servers.all.view";
    async handle(client: OurClient, data: any): ServerPacketResponse<"getAllServers"> {
        let serverList = db.prepare<unknown[], Server>("SELECT * FROM servers").all();
        let statuses = {} as ServerStatuses;
        serverList.forEach(server => {
            statuses[server.id.toString()] = {
                status: hasServerPermission(client.data.auth.user, server, "status") ? serverManager.getStatus(server) : "unknown"
            }
        });
        return {
            statuses,
            servers: serverList.map(s => s)
        };
    }
}
