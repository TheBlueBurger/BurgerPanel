import { OurClient, Packet } from "../index.js";
import { getAllSettings } from "../config.js";

export default class GetAllSettings extends Packet {
    name: string = "getAllSettings";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        // Ensure the user is an admin
        if (!client.data.auth.user?.admin) {
            client.json({
                type: "getAllSettings",
                success: false,
                message: "Not authenticated",
                emitEvent: true
            });
            // Probably bad actor. Disconnect them.
            client.close();
            return;
        }
        let val;
        try {
            val = await getAllSettings();
        } catch (err) {
            client.json({
                type: "getAllSettings",
                success: false,
                message: (err as any)?.message,
                emitEvent: true
            });
            return;
        }
        client.json({
            type: "getAllSettings",
            success: true,
            settings: val,
            emitEvent: true
        });
    }
}