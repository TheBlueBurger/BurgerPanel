import { OurClient, Packet } from "../index.js";
import { servers, users } from "../db.js";
import path from "path";
import type { CreateServerS2C } from "../../../Share/CreateServer.js"
import { getSetting, setSetting } from "../config.js";
import serverManager, { allowedSoftwares } from "../serverManager.js";

export default class Auth extends Packet {
    name: string = "createServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        if (!client.data.auth.user?.admin) {
            this.respond(client, {
                type: "createServer",
                success: false,
                message: "Not authenticated",
                emitEvent: true
            });
            return;
        }
        if (!data.name || data.name === "") {
            this.respond(client, {
                type: "createServer",
                success: false,
                message: "No name provided",
                emitEvent: true
            });
            return;
        }
        // Ensure the server name is unique
        if ((await servers.countDocuments({
            name: data.name
        }).exec()) > 0) {
            this.respond(client, {
                type: "createServer",
                success: false,
                message: "Server name already taken",
                emitEvent: true
            });
            return;
        }
        if (data.name.length > 16) {
            this.respond(client, {
                type: "createServer",
                success: false,
                message: "Server name is too long. It must be 16 characters or less.",
                emitEvent: true
            });
            return;
        }
        // Ensure the server name is valid
        if (!data.name.match(/^[a-zA-Z0-9_]+$/)) {
            this.respond(client, {
                type: "createServer",
                success: false,
                message: "Server name is invalid. Only alphanumeric characters and underscores are allowed.",
                emitEvent: true
            });
            return;
        }
        let serverPath;
        if (await getSetting("serverPath") == "") {
            this.respond(client, {
                type: "createServer",
                success: false,
                message: "Server path is not set. Please set it in the config.",
                emitEvent: true
            });
            return;
        }
        if (await getSetting("serverPathIsRelative")) {
            if (path.isAbsolute(await getSetting("serverPath") as string)) {
                await setSetting("serverPath", "");
                this.respond(client, {
                    type: "createServer",
                    success: false,
                    message: "Server path is absolute, but serverPathIsRelative is set to true. Please change the server path to be relative to the web server. It has been reset.",
                    emitEvent: true
                });
                return;
            }
            serverPath = path.join(await getSetting("serverPath") as string, data.name);
        } else {
            serverPath = path.join(await getSetting("serverPath") as string, data.name);
        }
        let version = data.version;
        if (!version) {
            version = await getSetting("defaultMCVersion");
        }
        let software = data.software;
        if (!software) {
            software = await getSetting("defaultMCSoftware");
        }
        let port = data.port;
        if (!port || typeof port !== "number" || port > 65535) {
            this.respond(client, {
                type: "createServer",
                success: false,
                message: "Invalid port",
                emitEvent: true
            });
            return;
        }
        if (!allowedSoftwares.includes(software)) {
            this.respond(client, {
                type: "createServer",
                success: false,
                message: "Invalid software",
                emitEvent: true
            });
            return;
        }
        console.log(`${client.data.auth.user.username} (${client.data.auth.user.username}) is creating server ${data.name} at port ${port}`);
        try {
            let server = await servers.create({
                name: data.name,
                allowedUsers: [client.data.auth.user._id],
                mem: parseInt(data.mem) || await getSetting("defaultMemory"),
                path: serverPath,
                software,
                version,
                port
            });
            await serverManager.setupServer(server.toJSON());
            this.respond(client, {
                type: "createServer",
                success: true,
                server: server.toJSON(),
                emitEvent: true
            });
        } catch(err) {
            this.respond(client, {
                type: "createServer",
                success: false,
                message: `Error: ${err}`,
                emitEvent: true
            });
            return;
        }
    }
    respond(client: OurClient, data: CreateServerS2C) {
        client.json(data);
    }
}