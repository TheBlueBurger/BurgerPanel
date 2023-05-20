import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { users } from "../db.js";
import filterUserData from "../util/filterUserData.js";
import { Permission } from "../../../Share/Permission.js";
import { Request } from "../../../Share/Requests.js";

export default class GetUsers extends Packet {
    name: Request = "getUsers";
    requiresAuth: boolean = true;
    permission: Permission = "users.view";
    async handle(client: OurClient, data: any): ServerPacketResponse<"getUsers"> {
        let userList = await users.find({}, {}, { limit: 10_000_000 }).exec();
        let filteredUserList = userList.map(usr => filterUserData(usr.toJSON()));
        return {
            userList: filteredUserList
        }
    }
}