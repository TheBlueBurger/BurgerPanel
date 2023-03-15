import { clients, OurClient, Packet } from "../index.js";
import { users } from "../db.js";

export default class DeleteUser extends Packet {
    name: string = "deleteUser";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        // Ensure the user is an admin
        if (!client.data.auth.user?.admin) {
            client.json({
                type: "setSetting",
                success: false,
                message: "Not authenticated",
                emitEvent: true
            });
            // Probably bad actor. Disconnect them.
            client.close();
            return;
        }
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
        if(data.id === client.data.auth.user._id) {
            client.close();
        }
        clients.forEach(c => {
            if(c.data.auth.user?._id.toString() === data.id) {
                c.close();
            }
        });
        client.json({
            type: "deleteUser",
            success: true,
            id: data.id,
            username: userToDelete.username,
            emitEvent: true
        });
    }
}