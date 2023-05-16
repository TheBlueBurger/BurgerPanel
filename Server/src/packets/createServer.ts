import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { servers } from "../db.js";
import path from "path";
import type { CreateServerS2C } from "../../../Share/CreateServer.js"
import { getSetting, setSetting } from "../config.js";
import serverManager from "../serverManager.js";
import { allowedSoftwares } from "../../../Share/Server.js";
import { Permission } from "../../../Share/Permission.js";
import logger, { LogLevel } from "../logger.js";
import isValidMCVersion from "../util/isValidMCVersion.js";
import { Request, RequestResponses } from "../../../Share/Requests.js";

export default class CreateServer extends Packet {
    name: Request = "createServer";
    requiresAuth: boolean = true;
    permission: Permission = "servers.create";
    async handle(client: OurClient, data: any): ServerPacketResponse<"createServer"> {
        if (!data.name || data.name === "") {
            return new Error("No name provided");
        }
        // Ensure the server name is unique
        if ((await servers.countDocuments({
            name: data.name
        }).exec()) > 0) {
            return new Error("Server name already taken");
        }
        if (data.name.length > 16) {
            return new Error("Server name is too long. It must be 16 characters or less.")
        }
        // Ensure the server name is valid
        if (!data.name.match(/^[a-zA-Z0-9_]+$/)) {
            return new Error("Server name is invalid. Only alphanumeric characters and underscores are allowed.")
        }
        let serverPath;
        if (await getSetting("serverPath") == "") {
            return new Error("Server path is not set. Please set it in the config.")
        }
        serverPath = path.join(await getSetting("serverPath") as string, data.name);
        let version = data.version;
        if (!version) {
            version = await getSetting("defaultMCVersion");
        }
        if(!await isValidMCVersion(version)) return new Error("Invalid version");
        let software = data.software;
        if (!software) {
            software = await getSetting("defaultMCSoftware");
        }
        let port = data.port;
        if (!port || typeof port !== "number" || port > 65535) {
            return new Error("Invalid port")
        }
        if (!allowedSoftwares.includes(software)) {
            return new Error("Invalid software");
        }
        logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.username}) is creating server ${data.name} at port ${port}`, "server.create", LogLevel.INFO);
        let server = await servers.create({
            name: data.name,
            allowedUsers: [{
                user: client.data.auth.user?._id,
                permissions: ["full"]
            }],
            mem: parseInt(data.mem) || await getSetting("defaultMemory"),
            path: serverPath,
            software,
            version,
            port
        });
        await serverManager.setupServer(server.toJSON());
        return {
            server: server.toJSON()
        }
    }
    respond(client: OurClient, data: CreateServerS2C) {
        client.json(data);
    }
}