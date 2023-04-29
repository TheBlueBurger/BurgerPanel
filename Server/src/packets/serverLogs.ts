import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import { hasServerPermission } from "../../../Share/Permission.js";
import path from "node:path";
import fs from "node:fs/promises";
import zlib from "node:zlib";
import logger, { LogLevel } from "../logger.js";
import { exists } from "../util/exists.js";

export default class ServerLogs extends Packet {
    name: string = "serverLogs";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any) {
        let server = await servers.findById(data.id).exec();
        if (!server || !hasServerPermission(client.data.auth.user, server.toJSON(), "oldlogs.read")) return;
        if(!server.path) return; // ?!?!?!
        let logPath = path.join(server.path, "logs");
        if(data.list) {
            try {
                let files = await fs.readdir(logPath);
                client.json({
                    type: "serverLogs",
                    success: true,
                    files,
                    emits: ["serverLogs-list"]
                });
            } catch {
                client.json({
                    type: "serverLogs",
                    success: false,
                    message: "Cannot read logs folder",
                    emits: ["serverLogs-list"]
                });
            }
        } else {
            if(!data.log) return;
            let logFile = path.join(logPath, data.log);
            if(!logFile.startsWith(logPath)) return; // nice try
            if(!exists(logFile)) {
                client.json({
                    type: "serverLogs",
                    success: false,
                    emits: ["serverLog-" + data.log]
                });
                return;
            }
            let fileData = await fs.readFile(logFile);
            logger.log(`${client.data.auth.user?.username} (${client.data.auth.user?.username}) is reading ${data.log}`, "logs.read", LogLevel.INFO);
            if(logFile.endsWith(".gz")) {
                zlib.gunzip(fileData, {}, (err, res) => {
                    if(!err) return client.json({
                        type: "serverLogs",
                        success: true,
                        log: res.toString(),
                        emits: ["serverLogs-" + data.log]
                    });
                    client.json({
                        type: "serverLogs",
                        success: false,
                        message: "Failed to gunzip",
                        emits: ["serverLogs-" + data.log]
                    });
                    logger.log("Unable to gunzip: " + err, "error", LogLevel.ERROR);
                })
            } else client.json({
                type: "serverLogs",
                success: true,
                log: fileData.toString(),
                emits: ["serverLogs-" + data.log]
            });
        }
    }
}