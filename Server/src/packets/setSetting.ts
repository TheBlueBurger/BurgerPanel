import { OurClient, Packet } from "../index.js";
import { setSetting } from "../config.js";
import { Permission } from "../../../Share/Permission.js";
import { disabledEditingFrontend } from "../../../Share/Config.js";
import logger, { LogLevel } from "../logger.js";

export default class SetSetting extends Packet {
    name: string = "setSetting";
    requiresAuth: boolean = true;
    permission: Permission = "settings.set";
    async handle(client: OurClient, data: any) {
        if(!client.data.auth.user) return;
        let val;
        if (!data.key || !data.value) {
            client.json({
                type: "setSetting",
                success: false,
                message: "Missing required key",
                emits: ["setSetting-" + data.key],
            });
            return;
        }
        if(disabledEditingFrontend.some(d => data.key.startsWith(d))) return;
        try {
            val = await setSetting(data.key, data.value);
        } catch (err) {
            client.json({
                type: "setSetting",
                success: false,
                message: (err as any)?.message,
                emits: ["setSetting-" + data.key],
            });
            return;
        }
        logger.log(`User ${client.data.auth.user?.username} is changing ${data.key} to ${val}.`, "settings.change", LogLevel.INFO);
        client.json({
            type: "setSetting",
            success: true,
            emits: ["setSetting-" + data.key],
            key: data.key,
            value: val,
        });
    }
}