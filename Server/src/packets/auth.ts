import { OurClient, Packet, ServerPacketResponse, lockDownExcludedUser, lockdownMode } from "../index.js";
import db, { getUserByToken } from "../db.js";
import serverManager from "../serverManager.js";
import logger, { LogLevel } from "../logger.js";
import { Server, ServerStatuses } from "../../../Share/Server.js";
import { hasServerPermission } from "../util/permission.js";
import makeHash from "../util/makeHash.js";
import { Request } from "../../../Share/Requests.js";
import { User } from "../../../Share/User.js";

export default class Auth extends Packet {
    name: Request = "auth";
    requiresAuth: boolean = false;
    async handle(client: OurClient, data: any): ServerPacketResponse<"auth"> {
        let user: User | undefined;
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
                user = db.prepare(`SELECT * FROM users WHERE username=? AND password=?`).get(data.username, makeHash(data.password)) as User | undefined;
            } else {
                if(typeof data.token != "string") return;
                user = getUserByToken.get(data.token);
            }
            if (!user) {
                logger.log("Failed login attempt!", "login.fail", LogLevel.WARNING);
                return "Login failed!";
            }
            if(lockdownMode && lockDownExcludedUser != user.id) return;
            client.data.auth.user = user;
            client.data.auth.authenticated = true;
            client.data.auth.token = client.data.auth.user.token;
            // Get the server list for the user
            let allowedServers = db.prepare(`SELECT servers.*, user_server_access.permissions FROM servers INNER JOIN user_server_access ON servers.id = user_server_access.server_id WHERE user_server_access.user_id = ?`).all(user.id) as (Server & {permissions: string})[];
            let statuses: ServerStatuses = {};
            allowedServers.forEach(server => {
                statuses[server.id.toString()] = {
                    status: hasServerPermission(client.data.auth.user, server.id, "status") ? serverManager.getStatus(server.id) : "unknown"
                }
            });
            if(!user) throw new Error("user isnt defined");
            const userPins = db.prepare("SELECT servers.id FROM servers INNER JOIN user_pins ON servers.id = user_pins.server_id WHERE user_pins.user_id = ?").all(user.id) as {id: number, name: string}[];
            logger.log(`User ${client.data.auth.user.username} (${client.data.auth.user.id}) logged in.`, "login.success", LogLevel.INFO);
            return {
                user: client.data.auth.user,
                servers: allowedServers,
                statuses,
                pins: userPins
            }
        }
    }
}
