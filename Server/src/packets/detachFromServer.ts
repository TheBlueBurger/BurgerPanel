import { OurClient, Packet } from "../index.js";
import serverManager from "../serverManager.js";

export default class DetachFromServer extends Packet {
    name: string = "detachFromServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        if (!data.id) return;
        serverManager.detachFromServer(client, data.id);
        client.json({
            type: "detachFromServer",
            success: true,
        });
    }
}