import { OurClient, Packet } from "../index.js";
import { servers, users } from "../db.js";
import type { AuthS2C } from "../../../Share/Auth.js"
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import logger, { LogLevel } from "../logger.js";
import { ServerStatuses } from "../../../Share/Server.js";
import { hasServerPermission } from "../util/permission.js";

export default class Auth extends Packet {
    name: string = "auth";
    requiresAuth: boolean = false;
    async handle(client: OurClient, data: any) {
        if (client.data.auth?.authenticated) {
            this.respond(client, {
                type: "auth",
                success: true,
                alreadyAuthenticated: true
            });
            return;
        } else {
            if (!data.token) {
                this.respond(client, {
                    type: "auth",
                    success: false,
                    message: "No token provided",
                    emitEvent: true,
                    emits: ["loginFailed"]
                });
                return;
            }
            try {
                client.data.auth.user = (await users.findOne({ token: data.token }).exec())?.toJSON();
            } catch {
                this.respond(client, {
                    type: "auth",
                    success: false,
                    message: "Invalid token",
                    emitEvent: true,
                    emits: ["loginFailed"]
                });
                return;
            }
            if (!client.data.auth.user) {
                this.respond(client, {
                    type: "auth",
                    success: false,
                    message: "Invalid token",
                    emitEvent: true,
                    emits: ["loginFailed"]
                });
                logger.log("Failed login attempt!", "login.fail", LogLevel.WARNING);
                return;
            }
            client.data.auth.authenticated = true;
            client.data.auth.token = data.token;
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
            this.respond(client, {
                type: "auth",
                success: true,
                user: client.data.auth.user,
                servers: allowedServers as any, // FIXME: Make this not any
                statuses
            });
            logger.log(`User ${client.data.auth.user.username} (${client.data.auth.user._id}) logged in.`, "login.success", LogLevel.INFO);
        }
    }
    respond(client: OurClient, data: AuthS2C) {
        client.json(data);
    }
}
