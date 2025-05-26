import { OurClient, Packet, ServerPacketResponse, clients } from "../index.js";
import db, { getUserByID } from "../db.js";
import { hasPermission, isValidPermissionString, Permission } from "../../../Share/Permission.js";
import filterUserData from "../util/filterUserData.js";
import { User } from "../../../Share/User.js";
import logger, { LogLevel } from "../logger.js";
import makeHash from "../util/makeHash.js";
import { Request } from "../../../Share/Requests.js";
import { makeToken } from "../util/token.js";

export default class EditUser extends Packet {
    name: Request = "editUser";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"editUser"> {
        let action = data.action;
        if (!data.id) return; // it sends it as user, should be .id
        let user = getUserByID.get(data.id);
        if(!user) return;
        switch (action) {
            case "setPermission":
                if (!hasPermission(client.data.auth.user, {all: ["users.permissions.write", "users.view"]})) {
                    // illegal!!!!
                    return "No permission to use that action!";
                }
                let permission = data.permission; //Gonna make frontend not allow you to edit perms you dont have access to
                let value = data.value;
                if (!isValidPermissionString(permission)) return; // crab

                // make sure that the user has access to give that permission, otherwise they can give other users full access lol
                if (!hasPermission(client.data.auth.user, permission)) {
                    return "No permission to give that permission!";
                }
                if(typeof value != "boolean") return;
                let currentPermissions = JSON.parse(user.permissions) as string[];
                if (value && permission) {
                    await logger.log(`${client.data.auth.user?.username} is giving the permission ${permission} to ${user.username}`, "user.permission.change", LogLevel.WARNING)
                    if (!currentPermissions.includes(permission)) {
                        // Add the permission
                        currentPermissions.push(permission);
                    } else {
                        return "User has this permission already!"
                    }
                } else if (!value && permission) {
                    await logger.log(`${client.data.auth.user?.username} is removing the permission ${permission} from ${user.username}`, "user.permission.change", LogLevel.WARNING)
                    if (!user?.permissions.includes(permission)) {
                        return "User does not have this permission!"
                    } else {
                        currentPermissions = currentPermissions.filter(perm => perm != permission);
                    }
                }
                db.prepare("UPDATE users SET permissions=? WHERE id=?").run(JSON.stringify(currentPermissions), user.id);
                this.sendUserUpdated(user);
                break;
            case "changePassword":
                if(client.data.auth.user?.id != user.id && !hasPermission(client.data.auth.user, "users.password.change")) {
                    return "You do not have permission to edit this user's password"
                }
                let newPassword = data.password;
                if(typeof newPassword != "string") return;
                if(newPassword.length < 6) {
                    return "Too insecure!"
                }
                let hashedPassword = makeHash(newPassword);
                if(hashedPassword == user.password) {
                    return "That is already the password!"
                }
                logger.log(`${client.data.auth.user?.username} is changing the password of ${user.username}!`, "user.password.changed", LogLevel.INFO);
                db.prepare("UPDATE users SET password=? WHERE id=?").run(hashedPassword, user.id);
                this.sendUserUpdated(user);
                break;
            case "changeUsername":
                if (!hasPermission(client.data.auth.user, "users.username.change.all") && !(client.data.auth.user?.id == user.id && !hasPermission(client.data.auth.user, "users.username.change.self")))
                    return `You do not have permission to edit the username of ${client.data.auth.user?.id == user.id ? "yourself" : "this person"}!`;
                    
                    if (typeof data.username != "string") return "Not a string!";

                    if(data.username.length == 0) return "Cant be empty!";
                    
                    logger.log(`${client.data.auth.user?.username} is changing the username of ${user.username} to ${data.username}!`, "user.username.changed", LogLevel.INFO);
                    
                    db.prepare("UPDATE users SET username=? WHERE id=?").run(data.username, user.id);
                    this.sendUserUpdated(user);
                break;
            case "finishSetup":
                if (user.id != client.data.auth.user?.id) return; //impossible
                    
                if (typeof user?.password != "string") {
                    return "Set a password first!"
                }
                db.prepare("UPDATE users SET setupPending=0 WHERE id=?").run(user.id);
                logger.log(`${client.data.auth.user?.username} finished setup!`, "user.username.changed", LogLevel.INFO);
                this.sendUserUpdated(user);
                break;
            
            case "resetToken":
                if (client.data.auth.user?.id != user.id && !hasPermission(client.data.auth.user, "users.token.reset")) return;
                logger.log(`${client.data.auth.user?.username} is resetting the token of ${user.username}`, "user.token.reset")
                const newToken = makeToken();
                db.prepare("UPDATE users SET token=? WHERE id=?").run(newToken, user.id);

                clients.filter(c => c.data.auth.user?.id == user.id).forEach(cl => {
                    if(cl != client) cl.close();
                });
                return {
                    user: filterUserData(user),
                    token: newToken
                }
            case "toggleDev":
                if(client.data.auth.user?.id != user.id) {
                    return "Not allowed to other users"
                }
                logger.log(`${client.data.auth.user.username} is ${user.devMode ? "disabling" : "enabling"} their dev mode`, "info");
                db.prepare("UPDATE users SET devMode=? WHERE id=?").run(!user.devMode, user.id);
                break;
            case "togglePin":
                if(user.id != client.data.auth.user?.id) return "Not allowed to others";
                /*
                let server = await servers.findById(data.server);
                if(!server || !userHasAccessToServer(user, server)) return "Server not found";
                if(!user.pins) user.pins = [];
                if(user.pins && user.pins.includes(server.id.toString())) user.pins = user.pins.filter(pin => pin != server?.id.toString());
                else user.pins.push(server.id.toString());
                if(user.pins.length >= 10) return "Too many pins!";*/
                const entry = db.prepare("SELECT 1 FROM user_pins WHERE user_id=? AND server_id=?").get(user.id, data.server);
                if(entry) db.prepare("DELETE FROM user_pins WHERE user_id=? AND server_id=?").run(user.id, data.server);
                else db.prepare("INSERT INTO user_pins (user_id, server_id) VALUES (?, ?)").run(user.id, data.server);
                return {
                    user: filterUserData(user),
                    pinStatus: !entry
                }
                break;
        }
        return {
            user: filterUserData(getUserByID.get(user.id)!)
        }
    }
    sendUserUpdated(user: User | undefined) {
        if(!user) return;
        const newUser = getUserByID.get(user.id);
        clients.forEach(c => {
            if (c.data.auth.user?.id == user.id) {
                c.data.auth.user = newUser; // i think i know whats happening but what!?!? ill attach my debugger
                c.json({
                    n: "yourUserEdited",
                    user: newUser,
                });
            }
        });
    }
}