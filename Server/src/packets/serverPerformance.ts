import { OurClient, Packet } from "../index.js";
import type { ServerPerformancePacketS2C } from "../../../Share/Perf.js";
import { cpuUsage, getMemoryUsage } from "../util/cpu.js"

export default class ServerPerformance extends Packet {
    name: string = "serverPerformance";
    cachedServerPerformance: ServerPerformancePacketS2C | null = null;
    lastUpdate: number = 0;
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        if (this.cachedServerPerformance && Date.now() - this.lastUpdate < 1500) {
            this.respond(client, this.cachedServerPerformance);
            return;
        }
        this.lastUpdate = Date.now();
        let packet: ServerPerformancePacketS2C = {
            type: "serverPerformance",
            cpu: cpuUsage(),
            mem: getMemoryUsage(),
            emitEvent: true,
            platform: process.platform,
        }
        this.cachedServerPerformance = packet;
        this.respond(client, packet);
    }
    respond(client: OurClient, data: ServerPerformancePacketS2C) {
        client.json(data);
    }
}