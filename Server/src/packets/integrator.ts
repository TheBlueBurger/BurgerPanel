import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { servers } from "../db.js";
import serverManager, { userHasAccessToServer } from "../serverManager.js";
import { Permission, hasServerPermission } from "../../../Share/Permission.js";
import { Request } from "../../../Share/Requests.js";

import IntegratorInstall from "./integrator/IntegratorInstall.js"
import serverIntegrator from "../serverIntegrator.js";

export default class IntegratorPacket extends Packet {
    name: Request = "integrator";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"integrator"> {
        const server  = await servers.findById(data.id);
        if(!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) return "Server not found!";
        switch(data.action) {
            case "install":
                if(!hasServerPermission(client.data.auth.user, server.toJSON(), "integrator.install")) return "You can't do that!";
                return await IntegratorInstall(server.toJSON(), client, data);
            case "status":
                const status = await serverIntegrator.request(server.toJSON(), "status");
                return {
                    type: "status",
                    status
                }
        }
        return;
    }
}