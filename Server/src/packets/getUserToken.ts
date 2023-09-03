import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { users } from "../db.js";
import { User } from "../../../Share/User.js";
import { Permission } from "../../../Share/Permission.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";

export default class GetUserToken extends Packet {
    name: Request = "getUserToken";
    requiresAuth: boolean = true;
    permission: Permission = "users.token.read";
    async handle(client: OurClient, data: any): ServerPacketResponse<"getUserToken"> {
        let userID = data.id;
        if (!userID) return;
        let user: User | undefined;
        user = (await users.findById(userID))?.toJSON();
        if (!user) return "User not found";
        logger.log(`User ${client.data.auth.user?.username} (${client.data.auth.user?._id}) is getting the token of ${user.username} (${user._id})!!`, "user.token.read", LogLevel.WARNING);
        return {
            token: user.token
        }
    }
}