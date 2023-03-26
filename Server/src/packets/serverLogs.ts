import { OurClient, Packet } from "../index.js";
import { servers } from "../db.js";
import { hasServerPermission } from "../../../Share/Permission.js";
import path from "node:path";
import fs from "node:fs/promises";
import zlib from "node:zlib";

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
                    emitEvent: true,
                    emits: ["serverLogs-list"]
                });
            } catch {
                client.json({
                    type: "serverLogs",
                    success: false,
                    message: "Cannot read logs folder",
                    emitEvent: true,
                    emits: ["serverLogs-list"]
                });
            }
        } else {
            if(!data.log) return;
            let logFile = path.join(logPath, data.log);
            if(!logFile.startsWith(logPath)) return; // nice try
            let fileData = await fs.readFile(logFile);
            let fileDataToSend = "";
            if(logFile.endsWith(".gz")) {
                zlib.gunzip(fileData, {}, (err, res) => {
                    if(!err) return client.json({
                        type: "serverLogs",
                        success: true,
                        log: res.toString(),
                        emitEvent: true,
                        emits: ["serverLogs-" + data.log]
                    });
                    client.json({
                        type: "serverLogs",
                        success: false,
                        message: "Failed to gunzip",
                        emitEvent: true,
                        emits: ["serverLogs-" + data.log]
                    });
                    console.log(err);
                })
            } else client.json({
                type: "serverLogs",
                success: true,
                log: fileData.toString(),
                emitEvent: true,
                emits: ["serverLogs-" + data.log]
            });
        }
    }
}