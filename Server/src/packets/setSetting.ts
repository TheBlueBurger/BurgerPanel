import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { setSetting } from "../config.js";
import { Permission } from "../../../Share/Permission.js";
import { disabledEditingFrontend } from "../../../Share/Config.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";

export default class SetSetting extends Packet {
    name: Request = "setSetting";
    requiresAuth: boolean = true;
    permission: Permission = "settings.set";
    async handle(client: OurClient, data: any): ServerPacketResponse<"setSetting"> {
        if(!client.data.auth.user) return;
        let val;
        if (!data.key || !data.value) {
            return "Missing required key";
        }
        if(disabledEditingFrontend.some(d => data.key.startsWith(d))) return;
        try {
            val = await setSetting(data.key, data.value);
        } catch (err) {
            return `${err}`;
        }
        logger.log(`User ${client.data.auth.user?.username} is changing ${data.key} to ${val}.`, "settings.change", LogLevel.INFO);
        return {
            key: data.key,
            value: data.value
        }
    }
}