import { OurClient, Packet } from "../index.js";
import { servers, users } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";

export default class SetServerOption extends Packet {
    name: string = "setServerOption";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        // Ensure the user is an admin
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
        if (data.mem && client.data.auth.user?.admin && typeof data.mem == "number" && data.mem > 0) {
            console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the memory of ${server.name} (${server._id}) to ${data.mem}`);
            server.mem = data.mem;
        }
        if (data.allowedUsers) {
            if (!Array.isArray(data.allowedUsers)) return;
            if(data.allowedUsers.length < 1) return;
            console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the allowed users of ${server.name} (${server._id}) to ${data.allowedUsers}`);
            if (data.allowedUsers.length > 20) return;
            for await (const userID of data.allowedUsers) {
                if (typeof userID != "string") return;
                let userData = await users.findById(userID).exec();
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
            }
            server.allowedUsers = data.allowedUsers;
        }
        if(data.port && client.data.auth.user?.admin) {
            server.port = data.port;
        }
        if(data.autoStart && client.data.auth.user?.admin && typeof data.autoStart == "boolean") {
            console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the auto start of ${server.name} (${server._id}) to ${data.autoStart}`);
            server.autoStart = data.autoStart;
        }
        await server.save(); // DO NOT MOVE THIS LINE DOWN. FUNCTIONS BELOW WILL AUTOMATICALLY SAVE THE SERVER AND WILL CAUSE CHAOS
        if(data.port && client.data.auth.user?.admin) {
            console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the port of ${server.name} (${server._id}) to ${data.port}`);
            await serverManager.changePort(server.toJSON(), data.port);
        }
        if(data.software) {
            console.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the software of ${server.name} (${server._id}) to ${data.software}`);
            await serverManager.editSoftware(server.toJSON(), data.software);
        }
        if(data.version) {
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