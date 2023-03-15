import { OurClient, Packet } from "../index.js";
import { setSetting } from "../config.js";

export default class SetSetting extends Packet {
    name: string = "setSetting";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        // Ensure the user is an admin
        if (!client.data.auth.user?.admin) {
            client.json({
                type: "setSetting",
                success: false,
                message: "Not authenticated",
                emits: ["setSetting-" + data.key],
                emitEvent: true
            });
            // Probably bad actor. Disconnect them.
            client.close();
            return;
        }
        let val;
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