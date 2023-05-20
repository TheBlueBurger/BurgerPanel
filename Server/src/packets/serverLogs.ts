import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import { servers } from "../db.js";
import { hasServerPermission } from "../../../Share/Permission.js";
import path from "node:path";
import fs from "node:fs/promises";
import zlib from "node:zlib";
import logger, { LogLevel } from "../logger.js";
import { exists } from "../util/exists.js";
import { Request } from "../../../Share/Requests.js";
import {promisify} from "node:util";
let ourGunzip = promisify(zlib.gunzip);
export default class ServerLogs extends Packet {
    name: Request = "serverLogs";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"serverLogs"> {
        let server = await servers.findById(data.id).exec();
        if (!server || !hasServerPermission(client.data.auth.user, server.toJSON(), "oldlogs.read")) return;
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
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.username}) is reading ${data.log}`, "logs.read", LogLevel.INFO);
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