import { OurClient, Packet } from "../index.js";
import { users } from "../db.js";
import filterUserData from "../util/filterUserData.js";

export default class CreateUser extends Packet {
    name: string = "createUser";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        // Ensure the user is an admin
        if (!client.data.auth.user?.admin) {
            client.json({
                type: "createUser",
                success: false,
                message: "Not authenticated",
            });
            return;
        }
        if (typeof data.username == "undefined" || typeof data.admin == "undefined") {
            client.json({
                type: "createUser",
                success: false,
                message: "Invalid request",
            });
            return;
        }
        let existingUser = await users.findOne({ username: data.username }).exec();
        if (existingUser) {
            client.json({
                type: "createUser",
                success: false,
                message: "Username already exists",
            });
            return;
        }
        let user = await users.create({
            admin: data.admin,
            username: data.username,
        });
        console.log(`${client.data.auth.user.username} (${client.data.auth.user._id}) created user '${user.username}' with admin status: ${user.admin}`)
        await user.save();
        client.json({
            type: "createUser",
            success: true,
            user: filterUserData(user.toJSON()),
            emitEvent: true
        });
    }
}