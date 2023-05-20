import { Request } from "../../../Share/Requests.js";
import { OurClient, Packet, ServerPacketResponse } from "../index.js";

export default class Ping extends Packet {
    name: Request = "ping";
    requiresAuth: boolean = false;
    async handle(client: OurClient, data: any): ServerPacketResponse<"ping"> {
        return;
    }
}