import { OurClient, Packet } from "../index.js";
import { servers, users } from "../db.js";
import type { AuthS2C } from "../../../Share/Auth.js"

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
            if(!data.token) {
                this.respond(client, {
                    type: "auth",
                    success: false,
                    message: "No token provided",
                    emitEvent: true,
                    emits: ["loginFailed"]
                });
                return;
            }
            // TODO: Actual database stuff
            try {
                client.data.auth.user = (await users.findOne({token: data.token}).exec())?.toJSON();
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
                console.log("Failed login attempt!");
                return;
            }
            client.data.auth.authenticated = true;
            client.data.auth.token = data.token;
            console.log(`User ${client.data.auth.user.username} (${client.data.auth.user._id}) logged in`);
            // Get the server list for the user
            let allowedServers = await servers.find({
                allowedUsers: {
                    $in: [client.data.auth.user._id]
                }
            }).exec();
            this.respond(client, {
                type: "auth",
                success: true,
                user: client.data.auth.user,
                servers: allowedServers as any, // FIXME: Make this not any
            })
        }
    }
    respond(client: OurClient, data: AuthS2C) {
        client.json(data);
    }
}
