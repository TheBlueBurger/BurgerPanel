import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { getUserByID } from "../db.js";
import { Permission } from "../../../Share/Permission.js";
import filterUserData from "../util/filterUserData.js";
import { Request } from "../../../Share/Requests.js";

export default class GetUserData extends Packet {
    name: Request = "getUserData";
    requiresAuth: boolean = true;
    permission: Permission = "users.view";
    async handle(client: OurClient, data: any): ServerPacketResponse<"getUserData"> {
        if(!data.id || typeof data.id != "number") {
            return "User not provided";
        }
        let user = getUserByID.get(data.id);
        if (user) return {
            user: filterUserData(user)
        }
        else return "Invalid user!";
    }
}
