import { OurClient, Packet } from "../index.js";
import { users } from "../db.js";
import { User } from "../../../Share/User.js";
import { Permission } from "../../../Share/Permission.js";
import logger, { LogLevel } from "../logger.js";

export default class GetUserToken extends Packet {
    name: string = "getUserToken";
    requiresAuth: boolean = true;
    permission: Permission = "users.token.read";
    async handle(client: OurClient, data: any) {
        let userID = data.id;
        if (!userID) return;
        let user: User | undefined;
        try {
            user = (await users.findById(userID).exec())?.toJSON();
            if (!user) throw new Error("");
        } catch {
            client.json({
                type: "getUserToken",
                success: false,
                message: "Not found",
                emitEvent: true,
                emits: ["getUserToken-" + userID]
            });
            return;
        }
        logger.log(`User ${client.data.auth.user?.username} (${client.data.auth.user?._id}) is getting the token of ${user.username} (${user._id})!!`, "user.token.read", LogLevel.WARNING);
        client.json({
            type: "getUserToken",
            success: true,
            emitEvent: true,
            emits: ["getUserToken-" + userID],
            token: user.token
        });
    }
}