import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import type { ServerAmountPacketS2C } from "../../../Share/ServerAmount.js";
import { Permission } from "../../../Share/Permission.js";
import hasPermission from "../util/permission.js";
import { User } from "../../../Share/User.js";
import { Request } from "../../../Share/Requests.js";
import { servers } from "../db.js";
import os from "node:os";

export default class ServerAmount extends Packet {
    name: Request = "serverAmount";
    cachedServerPerformance: ServerAmountPacketS2C | null = null;
    lastUpdate: number = 0;
    requiresAuth: boolean = true;
    permission: Permission = "servers.amount";
    async handle(client: OurClient, data: any): ServerPacketResponse<"serverAmount"> {
        if (this.cachedServerPerformance && Date.now() - this.lastUpdate < 1500) {
            return this.getOnlyAllowed(client.data.auth.user, this.cachedServerPerformance);
        }
        let amountOfServers = (await servers.getAll()).length || 0;
        this.lastUpdate = Date.now();
        let packet: ServerAmountPacketS2C = {
            type: "serverAmount",
            amount: amountOfServers
        }
       this.cachedServerPerformance = packet;
       return this.getOnlyAllowed(client.data.auth.user, packet);
    }
    getOnlyAllowed(user: User | undefined, data: ServerAmountPacketS2C) {
        if (!hasPermission(user, "servers.amount")) data.amount = undefined;
        return data;
    }
}