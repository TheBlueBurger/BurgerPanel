import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";

export default class GetAllServers extends Packet {
    name: string = "getAllServers";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        // Ensure the user is an admin
        if (!client.data.auth.user?.admin) {
            client.json({
                type: "getAllServers",
                success: false,
                message: "Not authenticated",
                emitEvent: true
            });
            return;
        }
        let serverList = await servers.find({}, {}, { limit: Infinity }).exec();
        client.json({
            type: "getAllServers",
            success: true,
            servers: serverList,
            emitEvent: true
        });
    }
}