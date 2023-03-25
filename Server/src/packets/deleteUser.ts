import { clients, OurClient, Packet } from "../index.js";
import { users } from "../db.js";
import { Permission } from "../../../Share/Permission.js";

export default class DeleteUser extends Packet {
    name: string = "deleteUser";
    requiresAuth: boolean = true;
    permission: Permission = "users.delete";
    async handle(client: OurClient, data: any) {
        if(!client.data.auth.user) return;
        let userToDelete = await users.findById(data.id).exec();
        if (!userToDelete) {
            client.json({
                type: "deleteUser",
                success: false,
                message: "User does not exist",
                emitEvent: true
            });
            return;
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
        console.log(client.data.auth?.user?.username + " (" + client.data.auth?.user?._id + ") is deleting the user " + userToDelete.username + " (" + userToDelete._id + ").")
        client.json({
            type: "deleteUser",
            success: true,
            id: data.id,
            username: userToDelete.username,
            emitEvent: true
        });
    }
}