import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import filterUserData from "../util/filterUserData.js";
import { Permission, PermissionString } from "../../../Share/Permission.js";
import { getSetting } from "../config.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";
import db, { getUserByID } from "../db.js";
import { makeToken } from "../util/token.js";

export default class CreateUser extends Packet {
    name: Request = "createUser";
    requiresAuth: boolean = true;
    permission: Permission = "users.create";
    async handle(client: OurClient, data: any): ServerPacketResponse<"createUser"> {
        if(!client.data.auth.user) return;
        if (typeof data.username == "undefined") return;
        let existingUser = db.prepare("SELECT 1 FROM users WHERE username=?").get(data.username);
        if (existingUser) {
            return "Username already exists!"
        }
        /*let user = await users.create({
            username: data.username,
            permissions: (await getSetting("defaultPermissions"))?.toString().split(",") as PermissionString[],
        });*/
        const userID = db.prepare("INSERT INTO users (username, permissions, token) VALUES (?, ?, ?)").run(data.username, JSON.stringify((await getSetting("defaultPermissions")).toString().split(",")), makeToken()).lastInsertRowid;
        const user = getUserByID.get(userID as number);
        if(!user) throw new Error("User doesnt exist just after creating!");
        logger.log(`${client.data.auth.user.username} (${client.data.auth.user.id}) created user '${user.username}'`, "user.create", LogLevel.INFO);
        return {
            user: filterUserData(user),
        };
    }
}