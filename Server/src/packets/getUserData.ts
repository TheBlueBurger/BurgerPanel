import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { servers, users } from "../db.js";
import { userHasAccessToServer } from "../serverManager.js";
import { Permission } from "../../../Share/Permission.js";
import filterUserData from "../util/filterUserData.js";
import { Request } from "../../../Share/Requests.js";

export default class GetUserData extends Packet {
    name: Request = "getUserData";
    requiresAuth: boolean = true;
    permission: Permission = "users.view";
    async handle(client: OurClient, data: any): ServerPacketResponse<"getUserData"> {
        if(!data.id || typeof data.id != "string") {
            return "User not provided";
        }
        let user = await users.findById(data.id).exec();
        if (user) return {
            user: filterUserData(user.toJSON())
        }
        else return "Invalid user!";
    }
}
