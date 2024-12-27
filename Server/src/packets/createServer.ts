import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import db, { getServerByID } from "../db.js";
import path from "path";
import { getSetting } from "../config.js";
import serverManager from "../serverManager.js";
import { allowedSoftwares } from "../../../Share/Server.js";
import { Permission } from "../../../Share/Permission.js";
import logger, { LogLevel } from "../logger.js";
import isValidMCVersion from "../util/isValidMCVersion.js";
import { Request, RequestResponses } from "../../../Share/Requests.js";
import { userHasAccessToServer } from "../util/permission.js";

export default class CreateServer extends Packet {
    name: Request = "createServer";
    requiresAuth: boolean = true;
    permission: Permission = "servers.create";
    async handle(client: OurClient, data: any): ServerPacketResponse<"createServer"> {
        if (!data.name || data.name === "" || typeof data.name != "string") {
            return "No name provided"
        }
        // Ensure the server name is unique
        if (db.prepare(`SELECT 1 FROM servers WHERE name=?`).get(data.name)) {
            return "Server name already taken"
        }
        if (data.name.length > 16) {
            return "Server name is too long. It must be 16 characters or less."
        }
        // Ensure the server name is valid
        if (!data.name.match(/^[a-zA-Z0-9_]+$/)) {
            return "Server name is invalid. Only alphanumeric characters and underscores are allowed."
        }
        let serverPath;
        if (await getSetting("serverPath") == "") {
            return "Server path is not set. Please set it in the config."
        }
        serverPath = path.join(await getSetting("serverPath") as string, data.name);
        let version = data.version;
        if (!version) {
            version = await getSetting("defaultMCVersion");
        }
        if(!await isValidMCVersion(version)) return "Invalid version"
        let software = data.software;
        if (!software) {
            software = await getSetting("defaultMCSoftware");
        }
        let port = data.port;
        if (!port || typeof port !== "number" || port > 65535) {
            return "Invalid port"
        }
        let serverUsingSamePort = db.prepare(`SELECT name, id FROM servers WHERE port=?`).get(port) as {name: string, id: number};
        if(serverUsingSamePort) return `Port is already in use${userHasAccessToServer(client.data.auth.user, serverUsingSamePort.id) ? " by " + serverUsingSamePort.name : ''}`
        if (!allowedSoftwares.includes(software)) {
            return "Invalid software"
        }
        logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.username}) is creating server ${data.name} at port ${port}`, "server.create", LogLevel.INFO);
        const serverID = db.prepare(`INSERT INTO servers (name, memory, path, software, version, port) VALUES (?, ?, ?, ?, ?, ?)`).run(
            data.name,
            parseInt(data.mem) || parseInt((await getSetting("defaultMemory")).toString()),
            serverPath,
            software,
            version,
            port
        ).lastInsertRowid;
        db.prepare("INSERT INTO user_server_access (user_id, server_id) VALUES (?,?)").run(client.data.auth.user?.id, serverID);
        const server = getServerByID.get(serverID.toString());
        if(!server) throw new Error("Ummmm. Shouldnt get here! Server doesnt exist but it should");
        await serverManager.setupServer(server);
        return {
            server: server
        }
    }
}