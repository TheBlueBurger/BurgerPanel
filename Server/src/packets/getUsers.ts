import { OurClient, Packet } from "../index.js";
import { users } from "../db.js";
import filterUserData from "../util/filterUserData.js";
import { Permission } from "../../../Share/Permission.js";

export default class GetUsers extends Packet {
    name: string = "getUsers";
    requiresAuth: boolean = true;
    permission: Permission = "users.view";
    async handle(client: OurClient, data: any) {
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