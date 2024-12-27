import { clients, OurClient, Packet, ServerPacketResponse } from "../index.js";
import type { OurWebsocketClient } from "../clients.js";
import { Permission } from "../../../Share/Permission.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";
import db, { getUserByID } from "../db.js";

export default class DeleteUser extends Packet {
    name: Request = "deleteUser";
    requiresAuth: boolean = true;
    permission: Permission = "users.delete";
    async handle(client: OurClient, data: any): ServerPacketResponse<"deleteUser"> {
        if(!client.data.auth.user) return;
        let userToDelete = getUserByID.get(data.id);
        if (!userToDelete) {
            return "User doesnt exist";
        }
        db.prepare("DELETE FROM users WHERE id=?").run(data.id);
        if (data.id === client.data.auth.user.id) {
            if(client.type == "Websocket") (client as OurWebsocketClient).close();
        }
        clients.forEach(c => {
            if (c.data.auth.user?.id.toString() === data.id) {
                c.close();
            }
        });
        logger.log(client.data.auth?.user?.username + " (" + client.data.auth?.user?.id + ") is deleting the user " + userToDelete.username + " (" + userToDelete.id + ").", "user.delete", LogLevel.WARNING);
    }
}