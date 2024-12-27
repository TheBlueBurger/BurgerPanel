import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { getServerByID } from "../db.js";
import path from "node:path";
import fs from "node:fs/promises";
import zlib from "node:zlib";
import logger, { LogLevel } from "../logger.js";
import { exists } from "../util/exists.js";
import { Request } from "../../../Share/Requests.js";
import {promisify} from "node:util";
import { hasServerPermission } from "../util/permission.js";
let ourGunzip = promisify(zlib.gunzip);
export default class ServerLogs extends Packet {
    name: Request = "serverLogs";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"serverLogs"> {
        let server = getServerByID.get(data.id);
        if (!server || !hasServerPermission(client.data.auth.user, server, "oldlogs.read")) return "No perm";
        if(!server.path) return; // ?!?!?!
        let logPath = path.join(server.path, "logs");
        if(data.list) {
            try {
                let files = await fs.readdir(logPath);
                return {
                    files,
                    type: "list"
                }
            } catch {
                return "Cannot read logs folder";
            }
        } else {
            if(!data.log) return;
            let logFile = path.join(logPath, data.log);
            if(!logFile.startsWith(logPath)) return; // nice try
            if(!await exists(logFile)) {
                return;
            }
            let fileData = await fs.readFile(logFile);
            logger.log(`${client.data.auth.user?.username} is reading ${data.log} in ${server.name}`, "logs.read", LogLevel.INFO);
            if(logFile.endsWith(".gz")) {
                let buff = await ourGunzip(fileData);
                return {
                    log: buff.toString(),
                    type: "log"
                }
            } else return {
                log: fileData.toString(),
                type: "log"
            }
        }
    }
}