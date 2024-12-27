import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import filterUserData from "../util/filterUserData.js";
import { Permission } from "../../../Share/Permission.js";
import { Request } from "../../../Share/Requests.js";
import db from "../db.js";
import { User } from "../../../Share/User.js";

export default class GetUsers extends Packet {
    name: Request = "getUsers";
    requiresAuth: boolean = true;
    permission: Permission = "users.view";
    async handle(client: OurClient, data: any): ServerPacketResponse<"getUsers"> {
        let userList = db.prepare<unknown[], User>("SELECT * FROM users").all();
        let filteredUserList = userList.map(usr => filterUserData(usr));
        return {
            userList: filteredUserList
        }
    }
}