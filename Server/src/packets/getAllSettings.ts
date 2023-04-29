import { OurClient, Packet } from "../index.js";
import { getAllSettings } from "../config.js";
import { Permission } from "../../../Share/Permission.js";

export default class GetAllSettings extends Packet {
    name: string = "getAllSettings";
    requiresAuth: boolean = true;
    permission: Permission = "settings.read";
    async handle(client: OurClient, data: any) {
        let val;
        try {
            val = await getAllSettings();
        } catch (err) {
            client.json({
                type: "getAllSettings",
                success: false,
                message: (err as any)?.message,
            });
            return;
        }
        client.json({
            type: "getAllSettings",
            success: true,
            settings: val,
        });
    }
}