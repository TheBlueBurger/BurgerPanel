import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import type { ServerPerformancePacketS2C } from "../../../Share/Perf.js";
import { getMemoryUsage } from "../util/cpu.js"
import { Permission } from "../../../Share/Permission.js";
import hasPermission from "../util/permission.js";
import { User } from "../../../Share/User.js";
import { Request } from "../../../Share/Requests.js";
import os from "node:os";

export default class ServerPerformance extends Packet {
    name: Request = "serverPerformance";
    cachedServerPerformance: ServerPerformancePacketS2C | null = null;
    lastUpdate: number = 0;
    requiresAuth: boolean = true;
    permission: Permission = "performance.view";
    async handle(client: OurClient, data: any): ServerPacketResponse<"serverPerformance"> {
        if (this.cachedServerPerformance && Date.now() - this.lastUpdate < 1500) {
            return this.getOnlyAllowed(client.data.auth.user, this.cachedServerPerformance);
        }
        this.lastUpdate = Date.now();
        let packet: ServerPerformancePacketS2C = {
            type: "serverPerformance",
            load: os.loadavg(),
            mem: getMemoryUsage(),
            platform: process.platform
        }
       this.cachedServerPerformance = packet;
       return this.getOnlyAllowed(client.data.auth.user, packet);
    }
    getOnlyAllowed(user: User | undefined, data: ServerPerformancePacketS2C) {
        if (!hasPermission(user, "performance.load")) data.load = undefined;
        if (!hasPermission(user, "performance.mem")) data.mem = undefined;
        if (!hasPermission(user, "performance.platform")) data.platform = undefined;
        return data;
    }
}