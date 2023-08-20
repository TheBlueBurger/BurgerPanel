import { OurClient, Packet, ServerPacketResponse, lockDownExcludedUser, lockdownMode } from "../index.js";
import { servers, users } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import logger, { LogLevel } from "../logger.js";
import { Server, ServerStatuses } from "../../../Share/Server.js";
import { hasServerPermission } from "../util/permission.js";
import makeHash from "../util/makeHash.js";
import { Request } from "../../../Share/Requests.js";
import { User } from "../../../Share/User.js";
import type { Model, Query } from "mongoose";
import assert from "../util/assert.js";
import { DatabaseObject } from "../db/databaseProvider.js";

export default class Auth extends Packet {
    name: Request = "auth";
    requiresAuth: boolean = false;
    async handle(client: OurClient, data: any): ServerPacketResponse<"auth"> {
        let filter: {username?: string; password?: string; token?: string} = {};
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
                    filter = { username: data.username, password: makeHash(data.password) };
                } catch {
                    return "Invalid username or password";
                }
            } else {
                try {
                    if(typeof data.token != "string") return;
                    filter = {token: data.token};
                } catch {
                    return "Token is invalid";
                }
            }
            assert((typeof filter.username == "string" && typeof filter.password == "string") || (typeof filter.token == "string"));
            let user = await users.findOne(filter);
            if (!user) {
                logger.log("Failed login attempt!", "login.fail", LogLevel.WARNING);
                return "Login failed!";
            }
            client.data.auth.user = user.toJSON();
            if(lockdownMode && lockDownExcludedUser != client.data.auth.user._id) return;
            client.data.auth.authenticated = true;
            client.data.auth.token = client.data.auth.user.token;
            // Get the server list for the user
            let allowedServers: DatabaseObject<Server>[];
            if(servers.isJSONCollection()) {
                allowedServers = (await servers.getAll()).filter(s => s.allowedUsers.some(a => a.user == client.data.auth.user?._id));
            } else if(servers.isMongoDBDatabaseProvider()) {
                // @ts-ignore
                allowedServers = await servers.find({
                    // @ts-ignore
                    "allowedUsers.user": client.data.auth.user?._id
                });
            } else throw new Error("unknown db type");
            allowedServers.filter(server => {
                return userHasAccessToServer(client.data.auth.user, server.toJSON())
            });
            let statuses: ServerStatuses = {};
            allowedServers.forEach(server => {
                statuses[server._id.toString()] = {
                    status: hasServerPermission(client.data.auth.user, server.toJSON(), "status") ? serverManager.getStatus(server.toJSON()) : "unknown"
                }
            });
            if(!user) throw new Error("user isnt defined");
            let pins = user.pins;
            if(pins != undefined) {
                let newPins: string[] = [];
                let broken = false;
                /*
                for await(let pin of pins) { // makes sure the user doesnt have bugged pins
                    try {
                        let server = await servers.findById(pin);
                        if(!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) throw new Error("");
                        newPins.push(pin);
                    } catch {
                        broken = true;
                    }
                }
                */
                await Promise.allSettled(pins.map(pin => new Promise(async (r) => {
                    try {
                        let server = await servers.findById(pin);
                        if(!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) throw new Error("");
                        newPins.push(pin);
                    } catch {
                        broken = true;
                    }
                    r(0);
                })));
                if(broken) {
                    logger.log(`${user.username} has at least one broken pin, removing it/them`, "debug", LogLevel.DEBUG);
                    user.pins = newPins;
                    await user.save();
                    client.data.auth.user = user.toJSON();
                }
            }
            logger.log(`User ${client.data.auth.user.username} (${client.data.auth.user._id}) logged in.`, "login.success", LogLevel.INFO);
            return {
                user: client.data.auth.user,
                servers: allowedServers.map(s => s.toJSON()),
                statuses
            }
        }
    }
}
