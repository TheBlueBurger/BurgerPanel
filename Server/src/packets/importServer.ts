import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import fs from "node:fs/promises";
import { servers } from "../db.js";
import serverManager from "../serverManager.js";
import path from "node:path";
import { Permission, userHasAccessToServer } from "../../../Share/Permission.js";
import logger, { LogLevel } from "../logger.js";
import { Request } from "../../../Share/Requests.js";
import { getSetting } from "../config.js";
import isValidMCVersion from "../util/isValidMCVersion.js";
import { allowedSoftwares } from "../../../Share/Server.js";

export default class ImportServer extends Packet {
    name: Request = "importServer";
    requiresAuth: boolean = true;
    permission: Permission = "servers.import";
    async handle(client: OurClient, data: any): ServerPacketResponse<"importServer"> {
        if (!data.path || typeof data.path != "string") {
            return "No path provided";
        }
        if (!path.isAbsolute(data.path)) {
            return "Path is not absolute";
        }
        let files: string[] = [];
        try {
            files = await fs.readdir(data.path);
        } catch {
            return "Invalid path"
        }
        let requiredFiles = ["server.jar"]; // can change later
        if (requiredFiles.some(file => !files.includes(file))) {
            return "Missing required files"
        }
        if (data.requestConfirmation) {
            // Get some useful info
            let version;
            let software;
            let port = 25565;
            try {
                let versionHistoryTxt = await fs.readFile(data.path + "/version_history.json", "utf8");
                let versionHistory = JSON.parse(versionHistoryTxt);
                let currentVersion = versionHistory.currentVersion.match(/^.+ \(MC: (.+)\)$/);
                if (currentVersion) version = currentVersion[1];
                software = versionHistory.currentVersion.match(/^git-(Paper|Purpur).*$/)[1];
                let serverPropertiesTxt = await fs.readFile(data.path + "/server.properties", "utf8");
                let serverPropertiesPort = serverPropertiesTxt.match(/server-port=([0-9]+)/);
                if (serverPropertiesPort) port = parseInt(serverPropertiesPort[1]);
            } catch { }
            return {
                autodetect: {
                    port: isNaN(port) ? 25565 : port,
                    software: software ? software.toLowerCase() : await getSetting("defaultMCSoftware"),
                    version: version ?? await getSetting("defaultMCVersion")
                },
                type: "autodetect"
            }
        }
        for (let requiredOption of ["name", "version", "mem", "software", "port"]) {
            if (!data[requiredOption]) {
                return "Missing " + requiredOption
            }
        }
        let serverUsingSamePort = await servers.findOne({port: data.port});
        if(serverUsingSamePort) return `Port is already in use${userHasAccessToServer(client.data.auth.user, serverUsingSamePort.toJSON()) ? " by " + serverUsingSamePort.name : ''}`
        if(!await isValidMCVersion(data.version)) return "Invalid MC version!";
        if(!allowedSoftwares.includes(data.software)) return "Invalid software!";
        logger.log("User" + client.data.auth.user?._id + " is importing " + data.path, "server.import", LogLevel.INFO)
        let server = await servers.create({
            name: data.name,
            version: data.version,
            mem: data.mem,
            software: data.software,
            allowedUsers: [{
                user: client.data.auth.user?._id,
                permissions: ["full"]
            }],
            port: data.port,
            path: data.path,
        });
        try {
            await serverManager.changePort(server.toJSON(), data.port); // if the user changes the port when importing the server, it will be changed in server files as well
        } catch {
            logger.log(`Could not change the port to the user specified one while importing the server ${server._id.toHexString()} (${server.name}), assuming the user is correct`, "server.import", LogLevel.WARNING);
        }
        return {
            server: server.toJSON(),
            type: "success"
        }
    }
}