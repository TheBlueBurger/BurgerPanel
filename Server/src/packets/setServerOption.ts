import { clients, OurClient, Packet, ServerPacketResponse } from "../index.js";
import db, { getServerByID, getUserByID } from "../db.js";
import serverManager from "../serverManager.js";
import { getServerPermissions, hasServerPermission, userHasAccessToServer } from "../util/permission.js";
import { ServerPermissions, DefaultServerProfiles, _ServerPermissions, hasPermission } from "../../../Share/Permission.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";
import isValidMCVersion from "../util/isValidMCVersion.js";

export default class SetServerOption extends Packet {
    name: Request = "setServerOption";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"setServerOption"> {
        if (!data.id) return;
        let server = getServerByID.get(data.id);
        const userPermissions = getServerPermissions(client.data.auth.user, server);
        if (!server || !(userPermissions || hasPermission(client.data.auth.user, "servers.all.view"))) {
            return "Server not found";
        }
        if (data.name && typeof data.name == "string" && data.name.length < 25 && data.name.length > 0) {
            // Check if the name is already taken
            if(!hasServerPermission(client.data.auth.user, server, "set.name", userPermissions)) return "Not allowed";
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.id}) is changing the name of ${server.name} (${server.id}) to ${data.name}`, "server.change-name");
            db.prepare("UPDATE servers SET name=? WHERE id=?").run(data.name, data.id);
        }
        if (data.mem && hasServerPermission(client.data.auth.user, server, "set.mem", userPermissions) && typeof data.mem == "number" && data.mem > 0) {
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.id}) is changing the memory of ${server.name} (${server.id}) to ${data.mem}`, "server.mem");
            db.prepare("UPDATE servers SET memory=? WHERE id=?").run(data.mem, server.id);
        }
        if (typeof data.jvmArgs == "string" && hasServerPermission(client.data.auth.user, server, "set.jvmArgs", userPermissions)) {
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.id}) is changing the jvmArgs of ${server.name} (${server.id}) to ${data.jvmArgs}`, "server.jvmArgs");
            db.prepare("UPDATE servers SET jvmargs=? WHERE id=?").run(data.jvmArgs, server.id);
        }
        if (data.allowedUsers) {
            let user = data?.allowedUsers?.user;
            switch (data?.allowedUsers?.action) {
                case "add":
                    if (hasServerPermission(client.data.auth.user, server, "set.allowedUsers.add", userPermissions)) {
                        // Ensure it's a valid user and not already added
                        if(!data?.allowedUsers?.user) return;
                        /*if(server.allowedUsers.some(au => au.user == data?.allowedUsers?.user)) {
                            return "Already added!"
                        }
                        let newUser = await users.findById(data.allowedUsers.user);
                        if(!newUser) return;
                        server.allowedUsers.push({permissions: [], user: data?.allowedUsers?.user});*/
                        const newUser = getUserByID.get(data.allowedUsers.user);
                        if(!newUser) return "User does not exist";
                        db.prepare("INSERT INTO user_server_access (user_id, server_id) VALUES (?, ?)").run(newUser.id, server.id);
                        logger.log(`User ${client.data.auth.user?.username} added user ${newUser.username} to the server ${server.name}`, "server.allowedUsers.changed", LogLevel.INFO);
                        this.sendNewServerPerms(newUser.id, server.id, "edit", []);
                    }
                    break;
                case "remove":
                    if (hasServerPermission(client.data.auth.user, server, "set.allowedUsers.remove", userPermissions)) {
                        let userToRemove = data?.allowedUsers?.user;
                        if(!userToRemove) return;
                        const userToRemoveData = db.prepare<any[], {permissions: string}>("SELECT permissions FROM user_server_access WHERE user_id=? AND server_id=?").get(userToRemove, server.id);
                        if(!userToRemoveData) return "User doesnt have access to the server or doesnt exist";
                        let permissions: string[] = JSON.parse(userToRemoveData.permissions);
                        if(permissions?.some(perm => {
                            if(!server) return true; // i got no idea why, but without this typescript explodes
                            return !hasServerPermission(client.data.auth.user, server, perm as ServerPermissions);
                        })) {
                            // user to remove has perms which the user trying to remove does not have, deny them
                            return "Cannot remove user with higher perms than you";
                        }
                        logger.log(`User ${client.data.auth.user?.username} removed user ${userToRemove} from the server ${server.name}`, "server.allowedUsers.changed", LogLevel.INFO);
                        db.prepare("DELETE FROM user_server_access WHERE user_id=? AND server_id=?").run(userToRemove.id, server.id);
                        this.sendNewServerPerms(userToRemove.id, server.id, "remove", []);
                    }
                    break;
                case "changePerm":
                    let newValue = data?.allowedUsers?.value;
                    let permission = data?.allowedUsers?.permission;
                    if(!user) return;
                    let userData = getUserByID.get(user);
                    if(!userData) return;
                    if(!userHasAccessToServer(userData, server)) return;
                    if(!_ServerPermissions.includes(permission)) return;
                    if(typeof newValue != "boolean") return;
                    if(!hasServerPermission(client.data.auth.user, server, "set.allowedUsers.permissions.write", userPermissions)) return;
                    if(!hasServerPermission(client.data.auth.user, server, permission, userPermissions)) return;
                    /*if(newValue && server.allowedUsers.some(au => {
                        return au.user == user && au.permissions.includes(permission)
                    })) return;
                    server.allowedUsers = server.allowedUsers.map(au => {
                        if(au.user == user) {
                            if(newValue) au.permissions.push(permission);
                            else au.permissions = au.permissions.filter(perm => perm != permission); 
                        }
                        return au;
                    });*/
                    const currentPermissions = db.prepare<any[], {permissions: string}>("SELECT permissions FROM user_server_access WHERE user_id=? AND server_id=?").get(user, server.id);
                    if(!currentPermissions) return;
                    const permissionSet = new Set(JSON.parse(currentPermissions.permissions));
                    if(newValue) permissionSet.add(permission);
                    else permissionSet.delete(permission);
                    const newPerms = [...permissionSet] as ServerPermissions[];
                    db.prepare("UPDATE user_server_access SET permissions=? WHERE user_id=? AND server_id=?").run(JSON.stringify(newPerms), user, server.id);
                    logger.log(`${client.data.auth.user?.username} set permission ${permission} of ${userData.username} in ${server.name} to ${newValue}`, "server.allowedUsers.changed", LogLevel.INFO);
                    this.sendNewServerPerms(userData.id, server.id, "edit", newPerms);
                    break;
                case "applyProfile":
                    if(!hasServerPermission(client.data.auth.user, server, "set.allowedUsers.permissions.write")) return;
                    let profileName = data.allowedUsers.profile;
                    let userToApplyProfileID = data?.allowedUsers?.user;
                    let profile = DefaultServerProfiles[profileName];
                    if(!profile) return;
                    if(profile.some(p => {
                        if(!server) return true;
                        return !hasServerPermission(client.data.auth.user, server, p, userPermissions)
                    })) return;
                    let userToApplyProfile = getUserByID.get(userToApplyProfileID);
                    if(!userToApplyProfile || !userHasAccessToServer(userToApplyProfile, server)) return;
                    db.prepare("UPDATE user_server_access SET permissions=? WHERE user_id=? AND server_id=?").run(JSON.stringify(profile), user, server.id);
                    logger.log(`${client.data.auth.user?.username} applied profile ${profileName} of ${userToApplyProfile.username} in ${server.name}`, "server.allowedUsers.changed", LogLevel.INFO);
                    this.sendNewServerPerms(userToApplyProfile.id, server.id, "edit", profile);
            }
        }
        if (typeof data.autoStart == "boolean" && hasServerPermission(client.data.auth.user, server, "set.autostart", userPermissions)) {
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.id}) is changing the auto start of ${server.name} (${server.id}) to ${data.autoStart}`, "server.autostart.change");
            db.prepare("UPDATE servers SET autostart=? WHERE id=?").run(data.autoStart ? 1 : 0, server.id);
        }
        if (typeof data.autoRestart == "boolean" && hasServerPermission(client.data.auth.user, server, "set.autorestart", userPermissions)) {
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.id}) is changing the auto restart of ${server.name} (${server.id}) to ${data.autoRestart}`, "server.autostart.change");
            db.prepare("UPDATE servers SET autorestart=? WHERE id=?").run(data.autoRestart ? 1 : 0, server.id);
        }
        // no longer needed since sql is superior
        // await server.save(); // DO NOT MOVE THIS LINE DOWN. FUNCTIONS BELOW WILL AUTOMATICALLY SAVE THE SERVER AND WILL CAUSE CHAOS
        if (data.port && hasServerPermission(client.data.auth.user, server, "set.port", userPermissions)) {
            db.prepare("UPDATE servers SET port=? WHERE id=?").run(data.port, server.id);
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.id}) is changing the port of ${server.name} (${server.id}) to ${data.port}`, "server.port", LogLevel.INFO);
            await serverManager.changePort(server, data.port);
        }
        if (data.software && hasServerPermission(client.data.auth.user, server, "set.software", userPermissions)) {
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.id}) is changing the software of ${server.name} (${server.id}) to ${data.software}`, "server.software", LogLevel.INFO);
            await serverManager.editSoftware(server, data.software);
            db.prepare("UPDATE servers SET software=? WHERE id=?").run(data.software, server.id);
        }
        if (data.version && hasServerPermission(client.data.auth.user, server, "set.version", userPermissions)) {
            if(!await isValidMCVersion(data.version)) return "Invalid version!";
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.id}) is changing the version of ${server.name} (${server.id}) to ${data.version}`, "server.version", LogLevel.INFO);
            await serverManager.editVersion(server, data.version);
            db.prepare("UPDATE servers SET version=? WHERE id=?").run(data.version, server.id);
        }
        return {
            server: getServerByID.get(server.id)!
        }
    }
    sendNewServerPerms(userID: number, serverID: number, type: string, permissions: ServerPermissions[]) {
        for(const client of clients) {
            if(client.data.auth.user?.id == userID) {
                client.json({
                    n: "serverPermissionChange",
                    serverID,
                    type,
                    permissions
                });
            }
        }
    }
}