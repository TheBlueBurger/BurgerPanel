import { OurClient, Packet } from "../index.js";
import { getSetting } from "../config.js";
import { allUsersAllowedToRead } from "../../../Share/Config.js";
import { Permission } from "../../../Share/Permission.js";

export default class GetSetting extends Packet {
    name: string = "getSetting";
    requiresAuth: boolean = true;
    permission: Permission = "settings.read";
    async handle(client: OurClient, data: any) {
        let value = await getSetting(data.key, true);
        client.json({
            type: "getSetting",
            emits: ["getSetting-" + data.key],
            success: true,
            key: data.key,
            value: value,
        });
    }
}