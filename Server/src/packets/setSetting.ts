import { OurClient, Packet } from "../index.js";
import { setSetting } from "../config.js";
import { Permission } from "../../../Share/Permission.js";

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
                emitEvent: true
            });
            return;
        }
        try {
            val = await setSetting(data.key, data.value);
        } catch (err) {
            client.json({
                type: "setSetting",
                success: false,
                message: (err as any)?.message,
                emits: ["setSetting-" + data.key],
                emitEvent: true
            });
            return;
        }
        console.log(`${client.data.auth.user.username} (${client.data.auth.user._id}) changed the value of ${data.key} to ${val}`);
        client.json({
            type: "setSetting",
            success: true,
            emits: ["setSetting-" + data.key],
            key: data.key,
            value: val,
            emitEvent: true
        });
    }
}