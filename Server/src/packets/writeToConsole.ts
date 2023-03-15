import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";

export default class WriteToConsole extends Packet {
    name: string = "writeToConsole";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        let server = await servers.findById(data.id).exec();
        if(!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            client.json({
                type: "writeToConsole",
                success: false,
                message: "Server not found",
                emitEvent: true,
                emits: ["writeToServer-" + data.id]
            });
            return;
        }
        if(typeof data.command != "string" || data.command.length > 1000 || data.command.length < 1) return;
        console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) wrote to console of ${server.name} (${server._id}): ${data.command}`);
        serverManager.writeToConsole(server.toJSON(), data.command, client.data.auth.user);
    }
}