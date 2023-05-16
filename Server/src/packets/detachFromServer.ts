import { Request } from "../../../Share/Requests.js";
import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import serverManager from "../serverManager.js";

export default class DetachFromServer extends Packet {
    name: Request = "detachFromServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"detachFromServer"> {
        if (!data.id) return;
        serverManager.detachFromServer(client, data.id);
    }
}