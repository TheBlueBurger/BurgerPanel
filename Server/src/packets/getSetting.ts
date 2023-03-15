import { OurClient, Packet } from "../index.js";
import { getSetting } from "../config.js";
import { allUsersAllowedToRead } from "../../../Share/Config.js";

export default class GetSetting extends Packet {
    name: string = "getSetting";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        // Ensure the user is an admin
        if (!client.data.auth.user?.admin && !allUsersAllowedToRead.includes(data.key)) {
            client.json({
                type: "getSetting",
                success: false,
                message: "Not authenticated",
            });
            console.log("User " + client.data.auth.user?.username + " tried to get setting '" + data.key + "' without being authenticated. Disconnecting them.");
            // Probably bad actor. Disconnect them.
            client.close();
            return;
        }
        let value = await getSetting(data.key, true);
        client.json({
            type: "getSetting",
            emits: ["getSetting-" + data.key],
            success: true,
            key: data.key,
            value: value,
            emitEvent: true
        });
    }
}