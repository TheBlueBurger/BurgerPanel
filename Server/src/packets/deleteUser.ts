import { clients, OurClient, Packet, ServerPacketResponse } from "../index.js";
import { users } from "../db.js";
import { Permission } from "../../../Share/Permission.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";

export default class DeleteUser extends Packet {
    name: Request = "deleteUser";
    requiresAuth: boolean = true;
    permission: Permission = "users.delete";
    async handle(client: OurClient, data: any): ServerPacketResponse<"deleteUser"> {
        if(!client.data.auth.user) return;
        let userToDelete = await users.findById(data.id).exec();
        if (!userToDelete) {
            return "User doesnt exist";
        }
        await userToDelete.deleteOne();
        if (data.id === client.data.auth.user._id) {
            client.close();
        }
        clients.forEach(c => {
            if (c.data.auth.user?._id.toString() === data.id) {
                c.close();
            }
        });
        logger.log(client.data.auth?.user?.username + " (" + client.data.auth?.user?._id + ") is deleting the user " + userToDelete.username + " (" + userToDelete._id + ").", "user.delete", LogLevel.WARNING);
    }
}