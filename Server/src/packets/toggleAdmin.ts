import { clients, OurClient, Packet } from "../index.js";
import { users } from "../db.js";

export default class ToggleAdmin extends Packet {
    name: string = "toggleAdmin";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        if (!client.data.auth.user?.admin) {
            client.json({
                type: "toggleAdmin",
                success: false,
                message: "Not authenticated",
            });
            return;
        }
        let user = await users.findById(data.id).exec();
        if (!user) {
            client.json({
                type: "toggleAdmin",
                success: false,
                message: "User not found",
            });
            return;
        }
        user.admin = !user.admin;
        console.log(`${client.data.auth.user.username} (${client.data.auth.user._id}) toggled admin status of ${user.username} to ${user.admin}`)
        await user.save();
        client.json({
            type: "toggleAdmin",
            success: true,
            emitEvent: true,
            emits: ["toggleadmin-" + user._id]
        });
        if (user.id == client.data.auth.user._id) {
            client.data.auth.user = user.toJSON();
        } else clients.forEach(c => {
            if (c.data.auth.user?._id.toString() === user?._id.toString()) {
                c.data.auth.user = user?.toJSON();
            }
        })
    }
}