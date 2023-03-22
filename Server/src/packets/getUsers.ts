import { OurClient, Packet } from "../index.js";
import { users } from "../db.js";
import filterUserData from "../util/filterUserData.js";

export default class GetUsers extends Packet {
    name: string = "getUsers";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        // Ensure the user is an admin
        if (!client.data.auth.user?.admin) {
            client.json({
                type: "getUsers",
                success: false,
                message: "Not authenticated",
            });
            return;
        }
        let userList = await users.find({}, {}, { limit: Infinity }).exec();
        let filteredUserList = userList.map(usr => filterUserData(usr.toJSON()));
        client.json({
            type: "getUsers",
            success: true,
            userList: filteredUserList,
            emitEvent: true
        });
    }
}