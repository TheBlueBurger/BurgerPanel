import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { servers, users } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { hasServerPermission } from "../util/permission.js";
import { hasPermission, ServerPermissions, DefaultServerProfiles, _ServerPermissions } from "../../../Share/Permission.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";
import isValidMCVersion from "../util/isValidMCVersion.js";

export default class SetServerOption extends Packet {
    name: Request = "setServerOption";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"setServerOption"> {
        if (!data.id) return;
        let server = await servers.findById(data.id).exec();
        if (!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) {
            return "Server not found";
        }
        if (data.name && typeof data.name == "string" && data.name.length < 25 && data.name.length > 0) {
            // Check if the name is already taken
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the name of ${server.name} (${server._id}) to ${data.name}`, "server.change-name");
            let serverWithSameName = await servers.findOne({ name: data.name }).exec();
            if (serverWithSameName) {
                return "Already taken";
            }
            server.name = data.name;
        }
        if (data.mem && hasServerPermission(client.data.auth.user, server.toJSON(), "set.mem") && typeof data.mem == "number" && data.mem > 0) {
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the memory of ${server.name} (${server._id}) to ${data.mem}`, "server.mem");
            server.mem = data.mem;
        }
        if (data.allowedUsers) {
            switch (data?.allowedUsers?.action) {
                case "add":
                    if (hasServerPermission(client.data.auth.user, server.toJSON(), "set.allowedUsers.add")) {
                        // Ensure it's a valid user and not already added
                        if(!data?.allowedUsers?.user) return;
                        if(server.allowedUsers.some(au => au.user == data?.allowedUsers?.user)) {
                            return "Already added!"
                        }
                        let newUser = await users.findById(data.allowedUsers.user).exec();
                        if(!newUser) return;
                        server.allowedUsers.push({permissions: [], user: data?.allowedUsers?.user});
                        logger.log(`User ${client.data.auth.user?.username} added user ${newUser.username} to the server ${server.name}`, "server.allowedUsers.changed", LogLevel.INFO);
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
                            return "Cannot remove user with higher perms than you";
                        }
                        logger.log(`User ${client.data.auth.user?.username} removed user ${userToRemove} from the server ${server.name}`, "server.allowedUsers.changed", LogLevel.INFO);
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
                    logger.log(`${client.data.auth.user?.username} set permission ${permission} of ${userData.username} in ${server.name} to ${newValue}`, "server.allowedUsers.changed", LogLevel.INFO);
                    break;
                case "applyProfile":
                    if(!hasServerPermission(client.data.auth.user, server.toJSON(), "set.allowedUsers.permissions.write")) return;
                    let profileName = data.allowedUsers.profile;
                    let userToApplyProfileID = data?.allowedUsers?.user;
                    let profile = DefaultServerProfiles[profileName];
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
                    logger.log(`${client.data.auth.user?.username} set applied profile ${profileName} of ${userToApplyProfile.username} in ${server.name}`, "server.allowedUsers.changed", LogLevel.INFO);
            }
        }
        if (data.port && hasServerPermission(client.data.auth.user, server.toJSON(), "set.port")) {
            server.port = data.port;
        }
        if (typeof data.autoStart == "boolean" && hasServerPermission(client.data.auth.user, server.toJSON(), "set.autostart")) {
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the auto start of ${server.name} (${server._id}) to ${data.autoStart}`, "server.autostart.change");
            server.autoStart = data.autoStart;
        }
        if (typeof data.autoRestart == "boolean" && hasServerPermission(client.data.auth.user, server.toJSON(), "set.autorestart")) {
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the auto restart of ${server.name} (${server._id}) to ${data.autoRestart}`, "server.autostart.change");
            server.autoRestart = data.autoRestart;
        }
        await server.save(); // DO NOT MOVE THIS LINE DOWN. FUNCTIONS BELOW WILL AUTOMATICALLY SAVE THE SERVER AND WILL CAUSE CHAOS
        if (data.port && hasServerPermission(client.data.auth.user, server.toJSON(), "set.port")) {
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the port of ${server.name} (${server._id}) to ${data.port}`, "server.port", LogLevel.INFO);
            await serverManager.changePort(server.toJSON(), data.port);
        }
        if (data.software && hasServerPermission(client.data.auth.user, server.toJSON(), "set.software")) {
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the software of ${server.name} (${server._id}) to ${data.software}`, "server.software", LogLevel.INFO);
            await serverManager.editSoftware(server.toJSON(), data.software);
        }
        if (data.version && hasServerPermission(client.data.auth.user, server.toJSON(), "set.version")) {
            if(!await isValidMCVersion(data.version)) return "Invalid version!";
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?._id}) is changing the version of ${server.name} (${server._id}) to ${data.version}`, "server.version", LogLevel.INFO);
            await serverManager.editVersion(server.toJSON(), data.version);
        }
        return {
            server: server.toJSON()
        }
    }
}