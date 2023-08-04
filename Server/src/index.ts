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
import { makeToken, servers, users } from './db.js';
import { Permission } from '../../Share/Permission.js';
import { Request, RequestResponses } from '../../Share/Requests.js';
import hasPermission from './util/permission.js';
import logger, { LogLevel } from './logger.js';
import {buildInfo} from "../../Share/BuildInfo.js";

export const isProd = process.env.NODE_ENV == "production";
let app = express();
if(!isProd) app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
})
let httpServer = http.createServer(app);
let wss = new WebSocketServer({ server: httpServer });
if(!isProd) app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});
app.use(express.json());
app.post("/api/request/:name", async (req, res, next) => {
    if(lockdownMode) return;
    if(!packetHandler.packets[req.params.name]) return next();
    if(req.headers["content-type"] != "application/json") return res.status(400).json({
        error: "No JSON"
    });
    let token = req.headers?.authorization;
    if(!token) return res.status(400).json({
        error: "Missing token"
    });
    let user = await users.findOne({token}).exec();
    if(!user) return res.status(401).json({
        error: "Invalid token"
    });
    if(!user.devMode) return res.status(401).json({
        error: "Developer mode is disabled for this account. See /debug"
    });
    let client: OurClient = {
        json(data) {
            if(data.e) {
                res.status(500).json({
                    error: data.e
                })
            } else if(data.d) {
                res.json(data.d);
            } else {
                res.json({});
            }
        },
        data: {
            auth: {
                authenticated: true,
                token,
                user: user.toJSON()
            },
            clientID: genClientID()
        },
        type: "APIRequest"
    };
    logger.log(`User ${client.data.auth.user?.username} is using ${req.params.name} through the API.`, "api", LogLevel.DEBUG);
    packetHandler.handle(client, {
        n: req.params.name,
        r: 0,
        d: req.body
    });
});

app.post("/api/uploadfile/:id", (req, res) => {
    let cb = httpUploadCallbacks[req.params.id];
    if(!cb) return res.sendStatus(401);
    let data = Buffer.from([]);
    req.on("data", chunk => {
        data = Buffer.concat([data, chunk]);
        if(data.byteLength > 100_000_000) {
            logger.log(`Attempted to upload too big file, over 100MB. ID: ${req.params.id}, destroying connection.`, "error", LogLevel.ERROR);
            req.socket.destroy();
        }
    });
    req.on("end", () => {
        res.sendStatus(200);
        cb(data);
    });
});
app.options("/api/uploadfile/:id", (_,r) => r.sendStatus(200));

let __dirname = url.fileURLToPath(new URL('.', import.meta.url));
if(isProd) {
    app.use(express.static(path.join(__dirname, "Web")));
    app.use((_, res) => {
        res.sendFile(path.join(__dirname, "Web", "index.html"));
    });
} else {
    app.use(express.static(path.join(__dirname, "..", "..", "..", "public")));
    app.use((_, res) => {
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
        let packet = this.packets[data.n];
        if (!packet) {
            logger.log(`User ${client.data.auth.user?.username || "(not logged in)"} attempted to use non-existing packet: ${data.n}`, "packet.invalid-packet", LogLevel.WARNING);
            return;
        }
        if(typeof data.r != "number") return; // hm
        if (packet.requiresAuth && !client.data.auth.authenticated) {
            console.log("Packet requires auth: " + packet.name);
            logger.log(`User attempted to use packet: ${data.n} but isn't logged in!`, "packet.invalid-packet", LogLevel.WARNING);
            return;
        }
        if(packet.permission && !hasPermission(client.data.auth?.user, packet.permission)) {
            logger.log(`User attempted to use packet: ${data.n} but doesn't have the perm required!`, "packet.invalid-packet", LogLevel.WARNING);
            client.json({
                r: data.r,
                e: "You do not have permission to use this packet!",
                n: data.n
            });
            return;
        }
        if(lockdownMode && lockDownExcludedUser != client.data.auth.user?._id && packet.name != "auth") return;
        try {
            let packetResponse = await packet.handle(client, data.d);
            if(typeof packetResponse == "string") {
                client.json({
                    r: data.r,
                    e: packetResponse,
                    n: data.n
                });
            } else {
                client.json({
                    r: data.r,
                    d: packetResponse,
                    n: data.n
                });
            }
        } catch (err) {
            client.json({
                r: data.r,
                e: "Internal server error. Read the server logs for more details.",
                n: data.n
            });
            logger.log(`Packet errored. User is ${client.data.auth?.user?.username} (${client.data.auth?.user?._id}) ${data.n} ${err}`, "error", LogLevel.ERROR);
        }
    }
}
export type ServerPacketResponse<T extends Request> = Promise<RequestResponses[T] | string | undefined>;
export class Packet {
    // @ts-expect-error
    name: Request = "EXAMPLE_DONT_USE";
    requiresAuth: boolean = true;
    requiresAdmin: boolean = false;
    permission: Permission | null = null;
    constructor() {
    }
    // @ts-expect-error
    async handle(client: OurClient, data: any): ServerPacketResponse<""> {
        throw new Error("Packet not implemented");
    }
}

export interface OurClient {
    data: {
        auth: {
            token?: string,
            user?: User,
            authenticated: boolean,
        },
        clientID: number
    },
    json: (data: any) => void,
    type: "APIRequest" | string
};

export interface OurWebsocketClient extends OurClient,WebSocket {
    type: "Websocket"
}

let packetHandler = new PacketHandler();
let logging = false;
let loggingIgnore: string[] = [];
export let lockdownMode = false;
export let lockDownExcludedUser = "";
let clientID = 0;
function genClientID() {
    return clientID++;
}
export const clients: OurWebsocketClient[] = [];
wss.on('connection', (_client) => {
    let client: OurWebsocketClient = _client as OurWebsocketClient;
    client.data = {
        auth: {
            authenticated: false,
        },
        clientID: genClientID()
    };
    client.type = "Websocket";
    client.json = (data: any) => {
        if (logging && !loggingIgnore.includes(data.type)) {
            console.log("SEND", data);
        }
        _client.send(JSON.stringify(data));
    };
    clients.push(client);
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
let httpUploadCallbacks: {
    [key: string]: (buf: Buffer) => void
} = {};
export function requestUpload(timeout: number = 60_000): (string | Promise<Buffer>)[] {
    let id = makeToken();
    while(typeof httpUploadCallbacks[id] != "undefined") {
        id = makeToken();
    }
    return [id, new Promise((res, rej) => {
        let cancelled = false;
        httpUploadCallbacks[id] = (buf: Buffer) => {
            if(cancelled) return;
            clearTimeout(timeoutID);
            res(buf);
        }
        let timeoutID = setTimeout(() => {
            delete httpUploadCallbacks[id];
            cancelled = true;
            rej("timed out");
        }, timeout);
    })];
}
let exiting = false;
export async function exit(signal?: string) {
    if(exiting) return;
    exiting = true;
    logger.log(`${signal ? "Recieved SIG" + signal + " - " : ""}Stopping!`, "info", LogLevel.INFO);
    await serverManager.stopAllServers();
    logger.log("All servers have been stopped, exiting", "info", LogLevel.DEBUG, true, true, true);
    process.exit();
}
process.on("SIGINT", () => exit("INT"));
process.on("SIGTERM", () => exit("TERM"));
packetHandler.init().then(async () => {
    logger.log(`BurgerPanel v${buildInfo.version} (${buildInfo.gitHash} on ${buildInfo.branch})`, "start", LogLevel.INFO);
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
                exit();
                break;
            case "packetLog":
                if(isProd) return logger.log("Attempted to enable packet logging in prod!", "error", LogLevel.ERROR);
                logging = !logging;
                console.log("Packet logging " + (logging ? "enabled" : "disabled"));
                break;
            case "lockdown":
                lockdownMode = !lockdownMode;
                if(lockdownMode) clients.forEach(c => c.close())
                logger.log(`Lockdown mode is now ${lockdownMode ? "enabled. Use the same command to re-enable. You may use delete-user to delete a user, gen-admin-user to make a new one and 'lockdown-exclude <user>' to exclude a user." : "disabled."}`, "info", LogLevel.WARNING);
                break;
            case "lockdown-auto":
                lockdownMode = true;
                clients.forEach(c => c.close())
                let lockdownUser = await users.create({username: "lockdown-" + Date.now(), setupPending: false, permissions: ["full"]});
                await lockdownUser.save();
                lockDownExcludedUser = lockdownUser._id.toString();
                logger.log(`Lockdown mode has been enabled. Use this token to log in: "${lockdownUser.token}". Use a private/incognito tab if you get stuck on logging in. Use 'lockdown' to disable.`, "info", LogLevel.INFO, false);
                break;
            case "help":
                console.log("users: List all users");
                console.log("gen-admin-user: Generate a admin user");
                console.log("servers: List all servers")
                console.log("stop: Stop all servers and exit");
                console.log("set-opt <option> <value>: Sets a setting");
                console.log("start <server>: Start a server");
                console.log("stop <server>: Stop a server");
                console.log("lockdown-auto: Enable lockdown mode and create a excluded user (recommended)");
                console.log("lockdown: Enter lockdown mode. All logins will be disabled. Nothing will work. Use in case of a hacked account, etc");
                console.log("lockdown-exclude <user id>: Exclude a user from lockdown.");
                console.log("delete-user <user id>: Remove a user.");
                break;
        }
        if(dataStr.startsWith("set-opt ")) { // ik this "command handler" is awful
            let args = dataStr.split(" ");
            args.shift();
            let option = args.shift();
            let value = args.join(" ");
            if(!isValidKey(option)) return logger.log(`Attempted to change config key ${option} to ${value} but it does not exist!`, "error", LogLevel.ERROR);
            await logger.log(`${option} is being changed to ${value} in the console`, "settings.change", LogLevel.INFO);
            await setSetting(option, value);
        } else if(dataStr.startsWith("start ")) {
            let server = await servers.findOne({name: dataStr.split(" ")[1]}).exec();
            try {
                if(!server) server = await servers.findById(dataStr.split(" ")[1]).exec();
            } catch {}
            if(!server) return logger.log("Server not found. Searched both by name and ID. Use 'servers' for a server list", "error", LogLevel.ERROR, false);
            serverManager.startServer(server?.toJSON());
        } else if(dataStr.startsWith("stop ")) {
            let server = await servers.findOne({name: dataStr.split(" ")[1]}).exec();
            try {
                if(!server) server = await servers.findById(dataStr.split(" ")[1]).exec();
            } catch {}
            if(!server) return logger.log("Server not found. Searched both by name and ID. Use 'servers' for a server list", "error", LogLevel.ERROR, false);
            serverManager.stopServer(server?.toJSON());
        } else if(dataStr.startsWith("lockdown-exclude ")) {
            lockDownExcludedUser = dataStr.split(" ")[1];
            logger.log(`${lockDownExcludedUser} is now excluded.`, "info", LogLevel.WARNING);
        } else if(dataStr.startsWith("delete-user ")) {
            let deleteUserID = dataStr.split(" ")[1];
            let deleteUser = await users.findById(deleteUserID).exec();
            if(!deleteUser) return logger.log(`${deleteUserID} cant be found.`, "error", LogLevel.ERROR);
            await deleteUser?.deleteOne();
            logger.log(`${deleteUser?.username} is now removed.`, "info");
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
    logger.log("Uncaught error: " + err, "error", LogLevel.ERROR, false, true, true).catch((err2) => {
        console.log("Error while logging error?!?!?: " + err2 + ". Original error: " + err);
    });
}