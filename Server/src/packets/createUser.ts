import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { users } from "../db.js";
import filterUserData from "../util/filterUserData.js";
import { Permission } from "../../../Share/Permission.js";
import { getSetting } from "../config.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";

export default class CreateUser extends Packet {
    name: Request = "createUser";
    requiresAuth: boolean = true;
    permission: Permission = "users.create";
    async handle(client: OurClient, data: any): ServerPacketResponse<"createUser"> {
        if(!client.data.auth.user) return;
        if (typeof data.username == "undefined") {
            client.json({
                type: "createUser",
                success: false,
                message: "Invalid request",
            });
            return;
        }
        let existingUser = await users.findOne({ username: data.username }).exec();
        if (existingUser) {
            client.json({
                type: "createUser",
                success: false,
                message: "Username already exists",
            });
            return;
        }
        let user = await users.create({
            username: data.username,
            permissions: (await getSetting("defaultPermissions"))?.toString().split(","),
        });
        logger.log(`${client.data.auth.user.username} (${client.data.auth.user._id}) created user '${user.username}'`, "user.create", LogLevel.INFO);
        await user.save();
        return {
            user: filterUserData(user.toJSON()),
        };
    }
}