import { OurClient, Packet } from "../index.js";

export default class Logout extends Packet {
    name: string = "logout";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        client.data.auth = {
            authenticated: false,
        };
        client.json({
            type: "logout",
            success: true,
        });
    }
}