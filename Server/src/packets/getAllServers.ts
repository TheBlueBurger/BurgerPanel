import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import { hasPermission } from "../../../Share/Permission.js";

export default class GetAllServers extends Packet {
    name: string = "getAllServers";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        if(!hasPermission(client.data.auth.user, "servers.all.view")) return;
        let serverList = await servers.find({}, {}, { limit: Infinity }).exec();
        client.json({
            type: "getAllServers",
            success: true,
            servers: serverList,
            emitEvent: true
        });
    }
}