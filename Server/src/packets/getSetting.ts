import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { getSetting } from "../config.js";
import { allUsersAllowedToRead } from "../../../Share/Config.js";
import { Permission } from "../../../Share/Permission.js";
import { Request } from "../../../Share/Requests.js";

export default class GetSetting extends Packet {
    name: Request = "getSetting";
    requiresAuth: boolean = true;
    permission: Permission = "settings.read";
    async handle(client: OurClient, data: any): ServerPacketResponse<"getSetting"> {
        let value = await getSetting(data.key, true);
        return {
            value
        }
    }
}