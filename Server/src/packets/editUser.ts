import { OurClient, Packet, clients } from "../index.js";
import { users } from "../db.js";
import { hasPermission, isValidPermissionString, Permission } from "../../../Share/Permission.js";
import filterUserData from "../util/filterUserData.js";
import { User } from "../../../Share/User.js";
import logger, { LogLevel } from "../logger.js";

export default class EditUser extends Packet {
    name: string = "editUser";
    requiresAuth: boolean = true;
    permission: Permission = "users.view"; // each action will require a different perm
    async handle(client: OurClient, data: any) {
        let action = data.action;
        if (!data.id) return; // it sends it as user, should be .id
        let user = await users.findById(data.id).exec();
        if(!user) return;
        switch (action) {
            case "setPermission":
                if (!hasPermission(client.data.auth.user, "users.permissions.write")) {
                    client.json({
                        success: false,
                        emitEvent: true,
                        emits: ["editUser-" + data.id],
                        message: "No permission to use that action!"
                    });
                    // illegal!!!!
                    return;
                }
                let permission = data.permission; //Gonna make frontend not allow you to edit perms you dont have access to
                let value = data.value;
                if (!isValidPermissionString(permission)) return; // crab

                // make sure that the user has access to give that permission, otherwise they can give other users full access lol
                if (!hasPermission(client.data.auth.user, permission)) {
                    client.json({
                        success: false,
                        emitEvent: true,
                        emits: ["editUser-" + data.id],
                        message: "No permission to give that permission!"
                    });
                    return;
                }
                if(typeof value != "boolean" || typeof permission != "string") return;
                if (value && permission) {
                    await logger.log(`${client.data.auth.user?.username} is giving the permission ${permission} to ${user.username}`, "user.permission.change", LogLevel.WARNING)
                    if (!user?.permissions.includes(permission)) {
                        // Add the permission
                        user?.permissions.push(permission);

                        client.json({ success: true, emitEvent: true, emits: ["editUser-" + data.id], user: filterUserData(user?.toJSON()) });
                    } else {
                        client.json({
                            success: false,
                            emitEvent: true,
                            emits: ["editUser-" + data.id],
                            message: "User has this permission already!"
                        });
                    }
                } else if (!value && permission) {
                    await logger.log(`${client.data.auth.user?.username} is removing the permission ${permission} from ${user.username}`, "user.permission.change", LogLevel.WARNING)
                    if (!user?.permissions.includes(permission)) {
                        client.json({
                            success: false,
                            emitEvent: true,
                            emits: ["editUser-" + data.id],
                            message: "User does not have this permission!!"
                        });
                    } else {
                        user.permissions = user.permissions.filter(perm => perm != permission);
                        client.json({ success: true, emitEvent: true, emits: ["editUser-" + data.id], user: filterUserData(user?.toJSON()) });
                    }
                }
                this.sendUserUpdated(user.toJSON());
        }
        user?.save(); // restart?
    }
    sendUserUpdated(user: User) {
        user._id = user._id.toString();
        clients.forEach(c => {
            if(c.data.auth.user?._id == user._id) {
                c.data.auth.user = user; // i think i know whats happening but what!?!? ill attach my debugger
                c.json({
                    type: "yourUserEdited",
                    user: user,
                    emitEvent: true
                });
            }
        });
    }
}