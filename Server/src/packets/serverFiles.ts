import { OurClient, Packet } from "../index.js";
import { servers, users } from "../db.js";
import { hasServerPermission } from "../util/permission.js";
import fs from "node:fs/promises";
import path from "node:path";
import mime from "mime-types";
import { allowedFileNames, allowedMimeTypes } from "../../../Share/Server.js";

export default class ServerFiles extends Packet {
    name: string = "serverFiles";
    requiresAuth: boolean = false;
    async handle(client: OurClient, data: any) {
        let server = await servers.findById(data.id).exec();
        if(!server || !hasServerPermission(client.data.auth.user, server?.toJSON(), "serverfiles.read")) return; //very bad!!!!
        // Make sure the user doesnt do anything spooky
        if(!data.path || typeof data.path != "string") return;
        if(/^[A-Za-z0-9\-_\.]+$/.test(data.path)) return; // i am aware this will lead to .. "working", we will need to join and make sure it doesnt end up outside
        let pathToCheck = path.join(server.path, data.path);
        if(!pathToCheck.startsWith(server.path)) return;
        // Lastly check if it actually exists
        try {
            await fs.stat(pathToCheck)
        } catch {
            return; // very spooky
        }
        // We should be safe now
        switch(data.action) {
            case "files":
                let files = await fs.readdir(pathToCheck);
                client.json({
                    type: "serverFiles",
                    success: true,
                    emitEvent: true,
                    files: (await Promise.allSettled(files.map(async f => {
                        return {
                            name: f,
                            folder: (await fs.stat(path.join(pathToCheck, f))).isDirectory()
                        }
                    }))).filter(e => e.status == "fulfilled")
                    // @ts-ignore I understand I shouldn't do this, but it is garantueed to exist and I use ?. just in case
                    .map(e => e?.value)
                });
                return;
            case "read":
                let statData = await fs.stat(pathToCheck);
                if(!statData.isFile()) return; // spooky
                if(statData.size > 32000) {
                    client.json({
                        type: "serverFiles",
                        emitEvent: true,
                        success: false,
                        message: "File is over size limit"
                    });
                    return;
                }
                let mimeData = mime.lookup(pathToCheck);
                if(!allowedMimeTypes.includes(mimeData.toString()) && !allowedFileNames.includes(data.path)) {
                    client.json({
                        type: "serverFiles",
                        emitEvent: true,
                        success: false,
                        message: "Disallowed file type!"
                    });
                    return;
                }
                let fileData = await fs.readFile(pathToCheck, "utf-8");
                client.json({
                    type: "serverFiles",
                    emitEvent: true,
                    success: true,
                    fileData
                });
        }
    }
}
