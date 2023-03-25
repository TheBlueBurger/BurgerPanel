import { OurClient, Packet } from "../index.js";
import type { ServerPerformancePacketS2C } from "../../../Share/Perf.js";
import { cpuUsage, getMemoryUsage } from "../util/cpu.js"
import { Permission } from "../../../Share/Permission.js";
import hasPermission from "../util/permission.js";
import { User } from "../../../Share/User.js";

export default class ServerPerformance extends Packet {
    name: string = "serverPerformance";
    cachedServerPerformance: ServerPerformancePacketS2C | null = null;
    lastUpdate: number = 0;
    requiresAuth: boolean = true;
    permission: Permission = "performance.view";
    async handle(client: OurClient, data: any) {
        if (this.cachedServerPerformance && Date.now() - this.lastUpdate < 1500) {
            this.respond(client, this.getOnlyAllowed(client.data.auth.user, this.cachedServerPerformance));
            return;
        }
        this.lastUpdate = Date.now();
        let packet: ServerPerformancePacketS2C = {
            type: "serverPerformance",
            emitEvent: true,
            load: cpuUsage(),
            mem: getMemoryUsage(),
            platform: process.platform
        }
       this.cachedServerPerformance = packet;
       this.respond(client, this.getOnlyAllowed(client.data.auth.user, packet));
    }
    getOnlyAllowed(user: User | undefined, data: ServerPerformancePacketS2C) {
        if (!hasPermission(user, "performance.load")) data.load = undefined;
        if (!hasPermission(user, "performance.mem")) data.mem = undefined;
        if (!hasPermission(user, "performance.platform")) data.platform = undefined;
        return data;
    }
    respond(client: OurClient, data: ServerPerformancePacketS2C) {
        client.json(data);
    }
}