import { OurClient, Packet, ServerPacketResponse, clients } from "../index.js";
import type { GeneralInformation, ServerPerformance } from "../../../Share/SystemInformation.js";
import { getMemoryUsage } from "../util/cpu.js"
import { Permission } from "../../../Share/Permission.js";
import hasPermission from "../util/permission.js";
import { User } from "../../../Share/User.js";
import { Request } from "../../../Share/Requests.js";
import os from "node:os";
import { servers } from "../db.js";

export default class SystemInformation extends Packet {
    name: Request = "systemInformation";
    cachedServerPerformance: ServerPerformance | null = null;
    cachedGeneralInfo: GeneralInformation | null = null;
    lastUpdate: number = 0;
    requiresAuth: boolean = true;
    permission: Permission = "performance.view";
    async handle(client: OurClient, data: any): ServerPacketResponse<"systemInformation"> {
        if(!client.data.auth.user) return;
        if (this.cachedServerPerformance && this.cachedGeneralInfo && Date.now() - this.lastUpdate < 1500) {
          return this.getOnlyAllowed(client.data.auth.user, this.cachedServerPerformance, this.cachedGeneralInfo);
        }
        this.lastUpdate = Date.now();
        let performance = this.getPerformance();
        this.cachedServerPerformance = performance;
        let general = await this.getGeneralInformation();
        this.cachedGeneralInfo = general;
        return this.getOnlyAllowed(client.data.auth.user, performance, general);
    }
    private async getGeneralInformation(): Promise<GeneralInformation> {
        return {
            serverAmount: await servers.countDocuments({}),
            clients: clients.map(c => ({username: c.data.auth?.user?.username,_id: c.data.auth?.user?._id}))
        }
    }
    private getPerformance(): ServerPerformance {
        return {
            load: os.loadavg(),
            mem: getMemoryUsage(),
            platform: process.platform
        }
    }
    private getOnlyAllowed(user: User, perf: ServerPerformance, general: GeneralInformation): Awaited<ServerPacketResponse<"systemInformation">> {
        if (!hasPermission(user, "performance.load")) perf.load = undefined;
        if (!hasPermission(user, "performance.mem")) perf.mem = undefined;
        if (!hasPermission(user, "performance.platform")) perf.platform = undefined;
        return {general: this.filterGeneralInformation(user, general), performance: this.filterPerformance(user, perf)};
    }
    filterPerformance(user: User, perf: ServerPerformance): Partial<ServerPerformance> {
        return {
            load: hasPermission(user, "performance.load") ? perf.load : undefined,
            mem: hasPermission(user, "performance.mem") ? perf.mem : undefined,
            platform: hasPermission(user, "performance.platform") ? perf.platform : undefined,
        }
    }
    filterGeneralInformation(user: User, general: GeneralInformation): Partial<GeneralInformation> {
        return {
            serverAmount: hasPermission(user, "serverinfo.servers.count") ? general.serverAmount : undefined,
            clients: hasPermission(user, {all: ["serverinfo.clients.count", "users.view"]}) ? general.clients : undefined
        };
    }
}