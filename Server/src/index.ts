import "./config.js"
import express from 'express';
import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import fs from "node:fs";
import path from "node:path";
import { User } from '../../Share/User.js';
import url from "node:url";
import { getSetting, isValidKey, setSetting } from './config.js';
import { once } from "node:events";
import serverManager from './serverManager.js';
import { servers, users } from './db.js';
import { Permission } from '../../Share/Permission.js';
import hasPermission from './util/permission.js';
import logger, { LogLevel } from './logger.js';

const isProd = process.env.NODE_ENV == "production";
let app = express();
if(!isProd) app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
})
let httpServer = http.createServer(app);
let wss = new WebSocketServer({ server: httpServer });
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});
let __dirname = url.fileURLToPath(new URL('.', import.meta.url));
if(isProd) {
    app.use(express.static(path.join(__dirname, "Web")));
    app.use((req, res) => {
        res.sendFile(path.join(__dirname, "Web", "index.html"));
    });
} else {
    app.use(express.static(path.join(__dirname, "..", "..", "..", "public")));
    app.use((req, res) => {
        res.sendFile(path.join(__dirname, "..", "..", "..", "public", "index.html"));
    })
}

class PacketHandler {
    packets: {
        [key: string]: Packet
    }
    constructor() {
        this.packets = {};
    }
    async init() {
        this.packets = {};
        if(process.env.NODE_ENV != "production") {
            let files = fs.readdirSync(__dirname + "/packets");
            for (let file of files) {
                if (!file.endsWith(".js")) continue;
                let packetClass = await import("./packets/" + file);
                let packet = new packetClass.default();
                this.packets[packet.name] = packet;
            }
        } else {
            // @ts-expect-error
            let packets = await import("../../../packets.mjs")
            packets.default.forEach((packetClass: any) => {
                let packet = new packetClass();
                this.packets[packet.name] = packet;
            });
        }
    }
    async handle(client: OurClient, data: any) {
        let packet = this.packets[data.type];
        if (!packet) {
            logger.log(`User ${client.data.auth.user?.username || "(not logged in)"} attempted to use non-existing packet: ${data.type}`, "packet.invalid-packet", LogLevel.WARNING);
            return;
        }
        if (packet.requiresAuth && !client.data.auth.authenticated) {
            console.log("Packet requires auth: " + packet.name);
            logger.log(`User attempted to use packet: ${data.type} but isn't logged in!`, "packet.invalid-packet", LogLevel.WARNING);
            return;
        }
        if(packet.permission && !hasPermission(client.data.auth?.user, packet.permission)) {
            client.json({
                type: data.type,
                success: false,
                message: "No permission",
            });
            logger.log(`User attempted to use packet: ${data.type} but doesn't have the perm required!`, "packet.invalid-packet", LogLevel.WARNING);
            return;
        }
        try {
            await packet.handle(client, data);
        } catch (err) {
            console.log("Packet errored.", data.type, data.data, err);
        }
    }
}
export class Packet {
    name: string = "EXAMPLE_DONT_USE";
    requiresAuth: boolean = true;
    requiresAdmin: boolean = false;
    permission: Permission | null = null;
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
        serverManager.handleDisconnect(client);
        clients.splice(clients.indexOf(client), 1);
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
        serverManager.handleDisconnect(client);
        logger.log(`User ${client.data.auth.user?.username || "(not logged in)"} disconnected.`, "disconnect", LogLevel.INFO);
        clients.splice(clients.indexOf(client), 1);
    });
});
async function exit(signal?: string) {
    console.log(`${signal ? "Recieved SIG" + signal + " - " : ""}Stopping!`);
    await serverManager.stopAllServers();
    console.log("All servers stopped, exiting");
    process.exit();
}
process.on("SIGINT", () => exit("INT"));
process.on("SIGTERM", () => exit("TERM"));
packetHandler.init().then(async () => {
    let port: number | undefined;
    portTry: try {
        port = await getSetting("webServerPort", true, true) as number;
    } catch {
        let portEnv = process.env?.PORT;
        if(portEnv) {
            port = parseInt(portEnv);
            break portTry;
        }
        console.log("Port not set. Please enter a port to listen on and press enter: ");
        while (!port) {
            let data = await (await once(process.stdin, "data")).toString().trim();
            let dataNum = parseInt(data);
            if (isNaN(dataNum) || dataNum < 1 || dataNum > 65535) {
                console.log("Invalid port. Please enter a port to listen on and press enter: ");
            } else {
                port = dataNum;
                await setSetting("webServerPort", port);
            }
        }
    }
    httpServer.listen(port, () => {
        logger.log(`Running on port ${port}`, "start", LogLevel.INFO);
        console.log("Type 'help' for help");
        serverManager.autoStartServers();
    });
    process.stdin.on("data", async (data) => {
        let dataStr = data.toString().trim();
        switch (dataStr) {
            case "users-table":
                var userlist = await users.find({}, {}, { limit: 256 });
                console.table(userlist.map(u => u.toJSON()).map(u => ({
                    _id: u._id.toString(),
                    name: u.username,
                    permissions: u.permissions
                })));
                break;
            case "users":
            case "users-list":
                var userlist = await users.find({}, {}, { limit: 256 });
                console.log("---------");
                for (let user of userlist.values()) {
                    console.log("Username: " + user.username);
                    console.log("ID: " + user._id);
                    console.log("Token: " + user.token);
                    console.log("Permissions: " + user.permissions);
                    console.log("Created at: " + user.createdAt);
                    console.log("---------");
                }
                break;
            case "gen-admin-user":
                let adminUser = await users.create({
                    permissions: ["full"],
                    username: "gen-admin-" + Date.now(),
                });
                console.log("Created admin user with ID " + adminUser._id + " and token " + adminUser.token);
                break;
            case "servers":
                console.log("---------");
                for (let server of await (await servers.find({}, {}, { limit: 256 })).values()) {
                    console.log("Server ID: " + server._id);
                    console.log("Server name: " + server.name);
                    console.log("Server port: " + server.port);
                    console.log("Server version: " + server.version);
                    console.log("Server status: " + (await serverManager.servers[server._id.toString()]?.childProcess ? "Running" : "Stopped"));
                    console.log("Server software" + server.software);
                    console.log("Server path: " + server.path);
                    console.log("Server autostart: " + server.autoStart);
                    console.log("Allowed users: " + (await Promise.all(server.allowedUsers.map(async u => {
                        let userdata = await users.findById(u.user);
                        return userdata?.username + " (" + u.permissions.join(", ") + ")";
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
                console.log("gen-admin-user: Generate a admin user");
                console.log("servers: List all servers")
                console.log("packetLog: Toggle packet logging");
                console.log("stop: Stop all servers and exit");
                console.log("set-opt <option> <value>: Sets a setting");
                break;
        }
        if(dataStr.startsWith("set-opt ")) { // ik this "command handler" is awful
            let args = dataStr.split(" ");
            args.shift();
            let option = args.shift();
            let value = args.join(" ");
            if(!isValidKey(option)) return;
            await logger.log(`${option} is being changed to ${value} in the console`, "settings.change", LogLevel.INFO);
            await setSetting(option, value);

        }
    });
    let adminUser = await users.findOne({
        permissions: "full"
    }).exec();
    if(!adminUser) {
        await logger.log("Unable to find admin user, creating one...", "start", LogLevel.DEBUG);
        let adminUser = await users.create({
            permissions: ["full"],
            username: "gen-admin-" + Date.now(),
        });
        adminUser.save();
        await logger.log("Created admin user with ID " + adminUser._id + " and token " + adminUser.token, "start", LogLevel.INFO, false);
    }
});
process.on("uncaughtException", errHandler);
process.on("unhandledRejection", errHandler);
function errHandler(err: any) {
    logger.log("Uncaught error: " + err, undefined, LogLevel.ERROR, false).catch((err2) => {
        console.log("Error while logging error?!?!?: " + err2 + ". Original error: " + err);
    });
}