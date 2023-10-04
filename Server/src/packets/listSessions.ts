import { Permission } from "../../../Share/Permission.js";
import { RequestResponses } from "../../../Share/Requests.js";
import { OurClient, Packet, ServerPacketResponse, clients } from "../index.js";

export default class ListSessions extends Packet {
    name: keyof RequestResponses = "listSessions";
    requiresAuth: boolean = true;
    permission: Permission = {all: ["serverinfo.clients.count", "users.view"]};
    async handle(client: OurClient, data: any): ServerPacketResponse<"listSessions"> {
        return clients.map(c => ({username: c.data.auth?.user?.username,_id: c.data.auth?.user?._id}));
    }
}