import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { getAllSettings } from "../config.js";
import { Permission } from "../../../Share/Permission.js";
import { Request } from "../../../Share/Requests.js";

export default class GetAllSettings extends Packet {
    name: Request = "getAllSettings";
    requiresAuth: boolean = true;
    permission: Permission = "settings.read";
    async handle(client: OurClient, data: any): ServerPacketResponse<"getAllSettings"> {
        let val = await getAllSettings();
        return val;
    }
}