import { OurClient, Packet, ServerPacketResponse, lockDownExcludedUser, lockdownMode } from "../index.js";
import { servers, users } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import logger, { LogLevel } from "../logger.js";
import { ServerStatuses } from "../../../Share/Server.js";
import { hasServerPermission } from "../util/permission.js";
import makeHash from "../util/makeHash.js";
import { Request } from "../../../Share/Requests.js";

export default class Auth extends Packet {
    name: Request = "auth";
    requiresAuth: boolean = false;
    async handle(client: OurClient, data: any): ServerPacketResponse<"auth"> {
        if (client.data.auth?.authenticated) {
            if(!client.data.auth.user) throw new Error("Huh. client.data.auth.authenticated is true but client.data.auth.user doesn't exist?");
            return {
                user: client.data.auth.user
            }
        } else {
            if (!data.token) {
                if(!data.username || !data.password) {
                    return "Missing username, password and token!";
                }
                if(typeof data.username != "string" || typeof data.password != "string") return;
                try {
                    client.data.auth.user = (await users.findOne({ username: data.username, password: makeHash(data.password) }).exec())?.toJSON();
                } catch {
                    return "Invalid username or password";
                }
            } else {
                try {
                    client.data.auth.user = (await users.findOne({ token: data.token }).exec())?.toJSON();
                } catch {
                    return "Token is invalid";
                }
            }
            if (!client.data.auth.user) {
                logger.log("Failed login attempt!", "login.fail", LogLevel.WARNING);
                return "Login failed!";
            }
            if(lockdownMode && lockDownExcludedUser != client.data.auth.user._id) return;
            client.data.auth.authenticated = true;
            client.data.auth.token = client.data.auth.user.token;
            // Get the server list for the user
            let allowedServers = await servers.find({
                "allowedUsers.user": client.data.auth.user?._id
            }).exec();
            allowedServers.filter(server => {
                return userHasAccessToServer(client.data.auth.user, server.toJSON())
            });
            let statuses: ServerStatuses = {};
            allowedServers.forEach(server => {
                statuses[server._id.toHexString()] = {
                    status: hasServerPermission(client.data.auth.user, server.toJSON(), "status") ? serverManager.getStatus(server.toJSON()) : "unknown"
                }
            });
            logger.log(`User ${client.data.auth.user.username} (${client.data.auth.user._id}) logged in.`, "login.success", LogLevel.INFO);
            return {
                user: client.data.auth.user,
                servers: allowedServers.map(s => s.toJSON()),
                statuses
            }
        }
    }
}
