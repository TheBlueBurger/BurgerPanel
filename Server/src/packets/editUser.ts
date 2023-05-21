import { OurClient, Packet, ServerPacketResponse, clients } from "../index.js";
import { makeToken, users } from "../db.js";
import { hasPermission, isValidPermissionString, Permission } from "../../../Share/Permission.js";
import filterUserData from "../util/filterUserData.js";
import { User } from "../../../Share/User.js";
import logger, { LogLevel } from "../logger.js";
import makeHash from "../util/makeHash.js";
import { Request } from "../../../Share/Requests.js";

export default class EditUser extends Packet {
    name: Request = "editUser";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"editUser"> {
        let action = data.action;
        if (!data.id) return; // it sends it as user, should be .id
        let user = await users.findById(data.id).exec();
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
                if (value && permission) {
                    await logger.log(`${client.data.auth.user?.username} is giving the permission ${permission} to ${user.username}`, "user.permission.change", LogLevel.WARNING)
                    if (!user?.permissions.includes(permission)) {
                        // Add the permission
                        user?.permissions.push(permission);
                    } else {
                        return "User has this permission already!"
                    }
                } else if (!value && permission) {
                    await logger.log(`${client.data.auth.user?.username} is removing the permission ${permission} from ${user.username}`, "user.permission.change", LogLevel.WARNING)
                    if (!user?.permissions.includes(permission)) {
                        return "User does not have this permission!"
                    } else {
                        user.permissions = user.permissions.filter(perm => perm != permission);
                    }
                }
                this.sendUserUpdated(user.toJSON());
                break;
            case "changePassword":
                if(client.data.auth.user?._id != user._id.toHexString() && !hasPermission(client.data.auth.user, "users.password.change")) {
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
                user.password = hashedPassword;
                this.sendUserUpdated(user.toJSON());
                break;
            case "changeUsername":
                if (!hasPermission(client.data.auth.user, "users.username.change.all") && !(client.data.auth.user?._id == user._id.toHexString() && !hasPermission(client.data.auth.user, "users.username.change.self")))
                    return `You do not have permission to edit the username of ${client.data.auth.user?._id == user._id.toHexString() ? "yourself" : "this person"}!`;
                    
                    if (typeof data.username != "string") return "Not a string!";

                    if(data.username.length == 0) return "Cant be empty!";
                    
                    logger.log(`${client.data.auth.user?.username} is changing the username of ${user.username} to ${data.username}!`, "user.username.changed", LogLevel.INFO);
                    
                    user.username = data.username;
                    
                    this.sendUserUpdated(user.toJSON());
                break;
            case "finishSetup":
                if (user._id.toHexString() != client.data.auth.user?._id) return; //impossible
                
                if (!user.setupPending) return client.requestReload(); // desync
                    
                if (typeof client.data.auth.user?.password != "string") {
                    return "Set a password first!"
                }
                user.setupPending = false;
                logger.log(`${client.data.auth.user?.username} finished setup!`, "user.username.changed", LogLevel.INFO);
                this.sendUserUpdated(user.toJSON());
                break;
            
            case "resetToken":
                if (client.data.auth.user?._id != user._id.toHexString() && !hasPermission(client.data.auth.user, "users.token.reset")) return;
                logger.log(`${client.data.auth.user?.username} is resetting the token of ${user.username}`, "user.token.reset")
                user.token = makeToken();
                
                clients.filter(c => c.data.auth.user?._id == client.data.auth.user?._id).forEach(cl => {
                    if(cl != client) cl.close();
                });
                await user.save();
                return {
                    user: filterUserData(user.toJSON()),
                    token: user.token
                }

        }
        await user?.save();
        return {
            user: filterUserData(user.toJSON())
        }
    }
    sendUserUpdated(user: User | undefined) {
        if(!user) return;
        user._id = user._id.toString();
        clients.forEach(c => {
            if (c.data.auth.user?._id == user._id) {
                c.data.auth.user = user; // i think i know whats happening but what!?!? ill attach my debugger
                c.json({
                    n: "yourUserEdited",
                    user: user,
                });
            }
        });
    }
}