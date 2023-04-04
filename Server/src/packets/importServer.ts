import { OurClient, Packet } from "../index.js";
import fs from "node:fs/promises";
import { servers } from "../db.js";
import serverManager from "../serverManager.js";
import path from "node:path";
import { Permission } from "../../../Share/Permission.js";
import logger, { LogLevel } from "../logger.js";

export default class ImportServer extends Packet {
    name: string = "importServer";
    requiresAuth: boolean = true;
    permission: Permission = "servers.import";
    async handle(client: OurClient, data: any) {
        if (!data.path || typeof data.path != "string") {
            client.json({
                type: "importServer",
                success: false,
                message: "No path provided",
                emitEvent: true,
            });
            return;
        }
        if (!path.isAbsolute(data.path)) {
            client.json({
                type: "importServer",
                success: false,
                message: "Invalid path: Not absolute",
                emitEvent: true,
            });
            return;
        }
        let files: string[] = [];
        try {
            files = await fs.readdir(data.path);
        } catch {
            client.json({
                type: "importServer",
                success: false,
                message: "Invalid path",
                emitEvent: true,
            });
            return;
        }
        let requiredFiles = ["server.jar"]; // can change later
        if (requiredFiles.some(file => !files.includes(file))) {
            client.json({
                type: "importServer",
                success: false,
                message: "Missing required files",
                emitEvent: true,
            });
            return;
        }
        if (data.requestConfirmation) {
            // Get some useful info
            let version;
            let software;
            let port;
            try {
                let versionHistoryTxt = await fs.readFile(data.path + "/version_history.json", "utf8");
                let versionHistory = JSON.parse(versionHistoryTxt);
                let currentVersion = versionHistory.currentVersion.match(/^.+ \(MC: (.+)\)$/);
                if (currentVersion) version = currentVersion[1];
                software = versionHistory.currentVersion.match(/^git-(Paper|Purpur).*$/)[1];
                let serverPropertiesTxt = await fs.readFile(data.path + "/server.properties", "utf8");
                let serverPropertiesPort = serverPropertiesTxt.match(/server-port=([0-9]+)/);
                if (serverPropertiesPort) port = serverPropertiesPort[1];
            } catch { }
            client.json({
                type: "importServer",
                success: true,
                emitEvent: true,
                autodetect: {
                    version,
                    software,
                    port
                }
            });
            return;
        }
        for (let requiredOption of ["name", "version", "mem", "software", "port"]) {
            if (!data[requiredOption]) {
                client.json({
                    type: "importServer",
                    success: false,
                    message: "Missing required option " + requiredOption,
                    emitEvent: true,
                });
                return;
            }
        }
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
        await serverManager.changePort(server.toJSON(), data.port); // if the user changes the port when importing the server, it will be changed in server files as well
        client.json({
            type: "importServer",
            success: true,
            emitEvent: true,
            server: server.toJSON()
        });
    }
}