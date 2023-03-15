import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";

export default class KillServer extends Packet {
    name: string = "killServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        let server = await servers.findById(data.id).exec();
        if(!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            client.json({
                type: "killServer",
                success: false,
                message: "Server not found"
            });
            return;
        }
        console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is killing ${server.name} (${server._id})`);
        await serverManager.killServer(server?.toJSON());
        client.json({
            type: "killServer",
            success: true,
            server,
            emitEvent: true,
            emits: ["server-killed-" + data.id]
        });
    }
}