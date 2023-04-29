import { OurClient, Packet } from "../index.js";
import { users } from "../db.js";
import filterUserData from "../util/filterUserData.js";
import { Permission } from "../../../Share/Permission.js";
import { getSetting } from "../config.js";
import logger, { LogLevel } from "../logger.js";

export default class CreateUser extends Packet {
    name: string = "createUser";
    requiresAuth: boolean = true;
    permission: Permission = "users.create";
    async handle(client: OurClient, data: any) {
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
            password: true
        });
        logger.log(`${client.data.auth.user.username} (${client.data.auth.user._id}) created user '${user.username}'`, "user.create", LogLevel.INFO);
        await user.save();
        client.json({
            type: "createUser",
            success: true,
            user: filterUserData(user.toJSON()),
        });
    }
}