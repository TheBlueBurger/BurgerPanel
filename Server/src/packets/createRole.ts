import { RoleType, roleTypes } from "../../../Share/Role.js";
import { servers } from "../db.js";
import { OurClient, Packet } from "../index.js";

export default class CreateRole extends Packet {
    name: string = "createRole";
    requiresAuth: boolean = false;
    async handle(client: OurClient, data: any) {
        let roleType: RoleType = data.roleType;
        if(!roleTypes.includes(roleType)) return;
        switch(roleType) {
            case "server":
                let server = await servers.findById(data.id).exec();
                if(!server) return;
                
                break;
            case "user":
                break;
        }
    }
}
