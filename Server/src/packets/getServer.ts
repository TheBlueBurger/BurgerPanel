import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import { userHasAccessToServer } from "../serverManager.js";

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
        client.json({
            type: "getServer",
            success: true,
            server,
            emitEvent: true,
            emits: ["getServer-" + data.id]
        });
    }
}