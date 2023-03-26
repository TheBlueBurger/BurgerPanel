import { OurClient, Packet } from "../index.js";
import { servers, users } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../util/permission.js";
import { hasPermission } from "../../../Share/Permission.js";

export default class SetServerOption extends Packet {
    name: string = "setServerOption";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        if (!data.id) return;
        let server = await servers.findById(data.id).exec();
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            client.json({
                type: "setServerOption",
                success: false,
                message: "Server not found",
                emitEvent: true,
                emits: ["setServerOption-" + data.id]
            });
            return;
        }
        if (data.name && typeof data.name == "string" && data.name.length < 25 && data.name.length > 0) {
            // Check if the name is already taken
            console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the name of ${server.name} (${server._id}) to ${data.name}`);
            let serverWithSameName = await servers.findOne({ name: data.name }).exec();
            if (serverWithSameName) {
                client.json({
                    type: "setServerOption",
                    success: false,
                    message: "Server name already taken",
                    emitEvent: true,
                    emits: ["setServerOption-" + data.id]
                });
                return;
            }
            server.name = data.name;
        }
        if (data.mem && hasServerPermission(client.data.auth.user, server.toJSON(), "set.mem") && typeof data.mem == "number" && data.mem > 0) {
            console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the memory of ${server.name} (${server._id}) to ${data.mem}`);
            server.mem = data.mem;
        }
        if (data.allowedUsers) {
            if (!Array.isArray(data.allowedUsers)) return;
            if (data.allowedUsers.length < 1) return;
            console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the allowed users of ${server.name} (${server._id}) to ${data.allowedUsers}`);
            if (data.allowedUsers.length > 20) return;
            let alreadyDoneUsers: string[] = [];
            for await (const user of data.allowedUsers) {
                if (typeof user.user != "string") return;
                if (alreadyDoneUsers.includes(user.user)) {
                    client.json({
                        type: "setServerOption",
                        success: false,
                        message: "Duplicate user: " + user.user,
                        emitEvent: true,
                        emits: ["setServerOption-" + data.id]
                    });
                    return;
                }
                let userData = await users.findById(user.user).exec();
                if (!userData) {
                    client.json({
                        type: "setServerOption",
                        success: false,
                        message: "User not found",
                        emitEvent: true,
                        emits: ["setServerOption-" + data.id]
                    });
                    return;
                }
                alreadyDoneUsers.push(user.user);
                for(let permission of user.permissions) {
                    if(!hasServerPermission(client.data.auth.user, server.toJSON(), permission)) {
                        client.json({
                            type: "setServerOption",
                            success: false,
                            message: "You are attempting to give " + user.user + " the permission " + permission + " which you dont have!",
                            emitEvent: true,
                            emits: ["setServerOption-" + data.id]
                        });
                        return;
                    }
                }
                // Ensure the user isn't giving permission to do something they can't
            }
            if(!hasServerPermission(client.data.auth.user, server.toJSON(), "set.allowedUsers.remove")) {
                // Ensure nobody has been removed
            }
            server.allowedUsers = data.allowedUsers;
        }
        if (data.port && hasServerPermission(client.data.auth.user, server.toJSON(), "set.port")) {
            server.port = data.port;
        }
        if (typeof data.autoStart == "boolean" && hasServerPermission(client.data.auth.user, server.toJSON(), "set.autostart")) {
            console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the auto start of ${server.name} (${server._id}) to ${data.autoStart}`);
            server.autoStart = data.autoStart;
        }
        await server.save(); // DO NOT MOVE THIS LINE DOWN. FUNCTIONS BELOW WILL AUTOMATICALLY SAVE THE SERVER AND WILL CAUSE CHAOS
        if (data.port && hasServerPermission(client.data.auth.user, server.toJSON(), "set.port")) {
            console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the port of ${server.name} (${server._id}) to ${data.port}`);
            await serverManager.changePort(server.toJSON(), data.port);
        }
        if (data.software) {
            console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the software of ${server.name} (${server._id}) to ${data.software}`);
            await serverManager.editSoftware(server.toJSON(), data.software);
        }
        if (data.version) {
            console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the version of ${server.name} (${server._id}) to ${data.version}`);
            await serverManager.editVersion(server.toJSON(), data.version);
        }
        client.json({
            type: "setServerOption",
            success: true,
            server,
            emitEvent: true,
            emits: ["setServerOption-" + data.id]
        });
    }
}