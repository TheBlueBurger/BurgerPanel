import express from 'express';
import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import fs from "node:fs";
import path from "node:path";
import { User } from '../../Share/User.js';
import url from "node:url";
import { getSetting, setSetting } from './config.js';
import { once } from "node:events";
import serverManager from './serverManager.js';
import { servers, users } from './db.js';
let app = express();
let httpServer = http.createServer(app);
let wss = new WebSocketServer({ server: httpServer });
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
})
let __dirname = url.fileURLToPath(new URL('.', import.meta.url));
app.use(express.static(path.join(__dirname, "..", "..", "..", "public")));
app.use((req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "..", "public", "index.html"));
})

class PacketHandler {
    packets: {
        [key: string]: Packet
    }
    constructor() {
        this.packets = {};
    }
    async init() {
        this.packets = {};
        let files = fs.readdirSync(__dirname + "/packets");
        for (let file of files) {
            if(!file.endsWith(".js")) continue;
            let packetClass = await import("./packets/" + file);
            let packet = new packetClass.default();
            this.packets[packet.name] = packet;
        }
        console.table(Object.values(this.packets).map(c => ({
            name: c.name,
            requiresAuth: c.requiresAuth,
            requiresAdmin: c.requiresAdmin,
        })));
    }
    async handle(client: OurClient, data: any) {
        let packet = this.packets[data.type];
        if (!packet) {
            console.log("Packet not found");
            return;
        }
        if (packet.requiresAuth && !client.data.auth.authenticated) {
            console.log("Packet requires auth: " + packet.name);
            return;
        }
        if (packet.requiresAdmin && !client.data.auth.user?.admin) {
            client.json({
                type: data.type,
                success: false,
                message: "Not authenticated. Admin required.",
            })
            return;
        }
        try {
            await packet.handle(client, data);
        } catch(err) {
            console.log("Packet errored.", data.type, data.data, err);
            // If admin, send error
            if (client.data.auth.user?.admin) {
                client.json({
                    type: "error",
                    message: "Error while handing " + data.type + ": " + (err as Error)?.message,
                });
            }
        }
    }
}
export class Packet {
    name: string = "EXAMPLE_DONT_USE";
    requiresAuth: boolean = true;
    requiresAdmin: boolean = false;
    constructor() {
    }
    handle(client: OurClient, data: any) {
        console.log("Packet not implemented");
    }
}

export interface OurClient extends WebSocket {
    data: {
        auth: {
            token?: string,
            user?: User,
            authenticated: boolean,
        }
    },
    json: (data: any) => void,
};
let packetHandler = new PacketHandler();
let logging = false;
let loggingIgnore: string[] = [];
export const clients: OurClient[] = [];
wss.on('connection', (_client) => {
    let client: OurClient = _client as OurClient;
    client.data = {
        auth: {
            token: undefined,
            authenticated: false,
        }
    };
    clients.push(client);
    client.json = (data: any) => {
        if (logging && !loggingIgnore.includes(data.type)) {
            console.log("SEND", data);
        }
        client.send(JSON.stringify(data));
    };
    client.on('error', err => {
        console.log("WS error", err);
    })
    client.on('message', (message) => {
        try {
            let data = JSON.parse(message.toString());
            if (logging && !loggingIgnore.includes(data.type)) {
                console.log("RECV", data);
            }
            packetHandler.handle(client, data);
        } catch (err) {
            try {
                console.log("Error while handling. Closing connection");
                client.close();
                console.log("Connection closed.");
            } catch {

            }
        }
    });
    client.on('close', () => {
        clients.splice(clients.indexOf(client), 1);
    });
});

process.on("SIGINT", async () => {
    console.log("Stopping!");
    await serverManager.stopAllServers();
    process.exit();
})
packetHandler.init().then(async () => {
    let port: number | undefined;
    try {
        port = await getSetting("webServerPort", true, true) as number;
    } catch {
        console.log("Port not set. Please enter a port to listen on and press enter: ");
        while(!port) {
            let data = await (await once(process.stdin, "data")).toString().trim();
            let dataNum = parseInt(data);
            if(isNaN(dataNum) || dataNum < 1 || dataNum > 65535) {
                console.log("Invalid port. Please enter a port to listen on and press enter: ");
            } else {
                port = dataNum;
                await setSetting("webServerPort", port);
            }
        }
    }
    httpServer.listen(port, () => {
        console.log("Listening on port " + port);
        console.log("Type 'help' for help");
        serverManager.autoStartServers();
    });
    process.stdin.on("data", async (data) => {
        let dataStr = data.toString().trim();
        switch (dataStr) {
            case "users-table":
                var userlist = await users.find({}, {}, {limit: 256});
                console.table(userlist.map(u => u.toJSON()));
                break;
            case "users":
            case "users-list":
                var userlist = await users.find({}, {}, {limit: 256});
                for(let user of userlist.values()) {
                    console.log("Username: " + user.username);
                    console.log("ID: " + user._id);
                    console.log("Token: " + user.token);
                    console.log("Admin: " + user.admin);
                    console.log("Created at: " + user.createdAt);
                    console.log("---------");
                }
                break;
            case "gen-admin-user":
                let adminUser = await users.create({
                    admin: true,
                    username: "gen-admin-" + Date.now(),
                });
                console.log("Created admin user with ID " + adminUser._id + " and token " + adminUser.token);
                break;
            case "servers":
                for(let server of await (await servers.find({}, {}, {limit: 256})).values()) {
                    console.log("Server ID: " + server._id);
                    console.log("Server name: " + server.name);
                    console.log("Server port: " + server.port);
                    console.log("Server version: " + server.version);
                    console.log("Server status: " + (await serverManager.servers[server._id.toString()]?.childProcess ? "Running" : "Stopped"));
                    console.log("Server software" + server.software);
                    console.log("Server path: " + server.path);
                    console.log("Server autostart: " + server.autoStart);
                    console.log("Allowed users: " + (await Promise.all(server.allowedUsers.map(async u => {
                        let userdata = await users.findById(u);
                        return userdata?.username + " (" + u + ")";
                    }))).join(", "));
                    console.log("---------");
                }
                break;
            case "exit":
            case "stop":
            case "quit":
                await serverManager.stopAllServers();
                process.exit();
                break;
            case "packetLog":
                logging = !logging;
                console.log("Packet logging " + (logging ? "enabled" : "disabled"));
                break;
            case "help":
                console.log("users: List all users");
                console.log("packetLog: Toggle packet logging");
                console.log("stop: Stop all servers and exit");
                break;
            default:
                console.log("Unknown command. Type 'help' for a list of Burgerpanel commands.");
        }
    });
});
process.on("uncaughtException", errHandler);
process.on("unhandledRejection", errHandler);
function errHandler(err: any) {
    console.log("Uncaught error", err);
}