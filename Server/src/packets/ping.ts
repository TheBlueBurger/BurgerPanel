import { OurClient, Packet } from "../index.js";

export default class Ping extends Packet {
    name: string = "ping";
    requiresAuth: boolean = false;
    async handle(client: OurClient, data: any) {
    }
}