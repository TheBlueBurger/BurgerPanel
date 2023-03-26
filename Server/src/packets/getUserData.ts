import { OurClient, Packet } from "../index.js";
import { servers, users } from "../db.js";
import { userHasAccessToServer } from "../serverManager.js";
import { Permission } from "../../../Share/Permission.js";
import filterUserData from "../util/filterUserData.js";

export default class GetUserData extends Packet {
    name: string = "getUserData";
    requiresAuth: boolean = true;
    permission: Permission = "users.view";
    async handle(client: OurClient, data: any) {
        if(!data.id || typeof data.id != "string") {
            client.json({
                type: "getUserData",
                success: false,
                reason: "User not provided!",
                emitEvent: true,
                emits: ["getUserData-" + data.id]
            });
            return;
        }
        let user = await users.findById(data.id).exec();
        if (user) client.json({
            type: "getUserData",
            success: true,
            user: filterUserData(user.toJSON()),
            emitEvent: true,
            emits: ["getUserData-" + data.id]
        });
        else client.json({
            type: "getUserData",
            success: false,
            reason: "Invalid user!",
            emitEvent: true,
            emits: ["getUserData-" + data.id]
        });
    }
}
