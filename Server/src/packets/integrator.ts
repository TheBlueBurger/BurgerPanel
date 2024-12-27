import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { Request } from "../../../Share/Requests.js";
import fs from "node:fs/promises";

import IntegratorInstall from "./integrator/IntegratorInstall.js"
import serverIntegrator from "../serverIntegrator.js";
import { exists } from "../util/exists.js";
import { hasServerPermission, userHasAccessToServer } from "../util/permission.js";
import { getServerByID } from "../db.js";

export default class IntegratorPacket extends Packet {
    name: Request = "integrator";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"integrator"> {
        const server  = getServerByID.get(data.id);
        if(!server || !userHasAccessToServer(client.data.auth.user, server)) return "Server not found!";
        if(!hasServerPermission(client.data.auth.user, server, "integrator.basic")) return "You can't use the integrator of this server!";
        switch(data.action) {
            case "install":
                if(!hasServerPermission(client.data.auth.user, server, "integrator.install")) return "You can't do that!";
                return await IntegratorInstall(server, client, data);
            case "status":
                if(!hasServerPermission(client.data.auth.user, server, "integrator.serverstatus")) return "You got no permission for getting the status!";
                const status = await serverIntegrator.request(server, "status", {}, true);
                return {
                    type: "status",
                    status
                }
            case "isInstalled":
                return {
                    type: "isInstalled",
                    installed: (await exists(server.path + "/plugins/")) && (await fs.readdir(server.path + "/plugins/")).some(a => a.endsWith(".jar") && a.startsWith("BurgerPanelIntegrator-"))
                }
        }
        return;
    }
}