import { OurClient, Packet } from "../index.js";
import { servers, users } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../util/permission.js";
import { hasPermission, ServerPermissions, ServerProfiles, _ServerPermissions } from "../../../Share/Permission.js";

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
            switch (data?.allowedUsers?.action) {
                case "add":
                    if (hasServerPermission(client.data.auth.user, server.toJSON(), "set.allowedUsers.add")) {
                        // Ensure it's a valid user and not already added
                        if(!data?.allowedUsers?.user) return;
                        if(server.allowedUsers.some(au => au.user == data?.allowedUsers?.user)) {
                            client.json({
                                type: "setServerOption",
                                success: false,
                                message: "Already added",
                                emitEvent: true,
                                emits: ["setServerOption-" + data.id]
                            });
                            return;
                        }
                        let newUser = await users.findById(data.allowedUsers.user).exec();
                        if(!newUser) return;
                        server.allowedUsers.push({permissions: [], user: data?.allowedUsers?.user});
                    }
                    break;
                case "remove":
                    if (hasServerPermission(client.data.auth.user, server.toJSON(), "set.allowedUsers.add")) {
                        let userToRemove = data?.allowedUsers?.user;
                        if(!userToRemove) return;
                        let permissions = server.allowedUsers.find(au => au.user == userToRemove)?.permissions;
                        if(permissions?.some(perm => {
                            if(!server) return true; // i got no idea why, but without this typescript explodes
                            return !hasServerPermission(client.data.auth.user, server.toJSON(), perm as ServerPermissions);
                        })) {
                            // user to remove has perms which the user trying to remove does not have, deny them
                            client.json({
                                type: "setServerOption",
                                success: false,
                                message: "Cannot remove user with higher perms than you",
                                emitEvent: true,
                                emits: ["setServerOption-" + data.id]
                            });
                            return;
                        }
                        server.allowedUsers = server.allowedUsers.filter(au => au.user != userToRemove);
                    }
                    break;
                case "changePerm":
                    let newValue = data?.allowedUsers?.value;
                    let permission = data?.allowedUsers?.permission;
                    let user = data?.allowedUsers?.user;
                    if(!user) return;
                    let userData = await users.findById(user).exec();
                    if(!userData) return;
                    if(!userHasAccessToServer(userData.toJSON(), server.toJSON())) return;
                    if(!_ServerPermissions.includes(permission)) return;
                    if(typeof newValue != "boolean") return;
                    if(!hasServerPermission(client.data.auth.user, server.toJSON(), "set.allowedUsers.permissions.write")) return;
                    if(!hasServerPermission(client.data.auth.user, server.toJSON(), permission)) return;
                    if(newValue && server.allowedUsers.some(au => {
                        return au.user == user && au.permissions.includes(permission)
                    })) return;
                    server.allowedUsers = server.allowedUsers.map(au => {
                        if(au.user == user) {
                            if(newValue) au.permissions.push(permission);
                            else au.permissions = au.permissions.filter(perm => perm != permission); 
                        }
                        return au;
                    });
                    break;
                case "applyProfile":
                    if(!hasServerPermission(client.data.auth.user, server.toJSON(), "set.allowedUsers.permissions.write")) return;
                    let profileName = data.allowedUsers.profile;
                    let userToApplyProfileID = data?.allowedUsers?.user;
                    let profile = ServerProfiles[profileName];
                    if(!profile) return;
                    if(profile.some(p => {
                        if(!server) return true;
                        return !hasServerPermission(client.data.auth.user, server.toJSON(), p)
                    })) return;
                    let userToApplyProfile = await users.findById(userToApplyProfileID).exec();
                    if(!userToApplyProfile || !userHasAccessToServer(userToApplyProfile.toJSON(), server.toJSON())) return;
                    server.allowedUsers = server.allowedUsers.map(au => {
                        if(au.user == userToApplyProfileID) {
                            au.permissions = profile;
                        }
                        return au;
                    });
                    client.json({
                        type: "setServerOption",
                        success: true,
                        server: server.toJSON()
                    });
            }
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