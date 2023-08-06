import { OurClient, Packet, ServerPacketResponse, requestDownload, requestUpload } from "../index.js";
import { servers, users } from "../db.js";
import { hasServerPermission } from "../util/permission.js";
import fs from "node:fs/promises";
import path from "node:path";
import mime from "mime-types";
import { allowedFileNames, allowedMimeTypes } from "../../../Share/Server.js";
import { Request } from "../../../Share/Requests.js";
import logger, { LogLevel } from "../logger.js";

export default class ServerFiles extends Packet {
    name: Request = "serverFiles";
    requiresAuth: boolean = false;
    async handle(client: OurClient, data: any): ServerPacketResponse<"serverFiles"> {
        let server = await servers.findById(data.id).exec();
        if(!server || !hasServerPermission(client.data.auth.user, server?.toJSON(), "serverfiles.read")) return "No perm"; //very bad!!!!
        // Make sure the user doesnt do anything spooky
        if(!data.path || typeof data.path != "string") return;
        if(data.path.includes("..")) return; // just in case
        let pathToCheck = path.join(server.path, data.path);
        if(!pathToCheck.startsWith(server.path)) return;
        // Lastly check if it actually exists
        try {
            await fs.stat(pathToCheck)
        } catch {
            if(data.action != "upload") return "Invalid path"; // very spooky
        }
        // We should be safe now
        switch(data.action) {
            case "files":
                let files = await fs.readdir(pathToCheck);
                return {
                    files: (await Promise.allSettled(files.map(async f => {
                        return {
                            name: f,
                            folder: (await fs.stat(path.join(pathToCheck, f))).isDirectory()
                        }
                    }))).filter(e => e.status == "fulfilled")
                    // @ts-ignore I understand I shouldn't do this, but it is garantueed to exist and I use ?. just in case
                    .map(e => e?.value),
                    type: "filelist"
                }
            case "read":
                let statData = await fs.stat(pathToCheck);
                if(!statData.isFile()) return; // spooky
                if(statData.size > 320_000) {
                    return "File is over size limit (320kb)"
                }
                let mimeData = mime.lookup(pathToCheck);
                if(!allowedMimeTypes.includes(mimeData.toString()) && !allowedFileNames.includes(data.path)) {
                    return "Disallowed type!"
                }
                logger.log(`${client.data.auth.user?.username} is reading ${data.path} in ${server.name}`, "server.file.read", LogLevel.INFO);
                let fileData = await fs.readFile(pathToCheck, "utf-8");
                return {
                    fileData,
                    type: "data"
                }
            case "write":
                if(!hasServerPermission(client.data.auth.user, server.toJSON(), "serverfiles.write")) return "No permission";
                let writeStatData = await fs.stat(pathToCheck);
                if(writeStatData.size > 320_000) {
                    return "File is over size limit (320kb)"
                }
                let writeMimeData = mime.lookup(pathToCheck);
                if(!allowedMimeTypes.includes(writeMimeData.toString()) && !allowedFileNames.includes(data.path)) {
                    return "Disallowed type!"
                }
                if(typeof data.data != "string") return "Missing data";
                if(data.data.length > 320_000) return "Too big!!!";
                logger.log(`${client.data.auth.user?.username} is updating ${data.path} in ${server.name}. Size: ${writeStatData.size} -> ${data.data.length}`, "server.file.write");
                await fs.writeFile(pathToCheck, data.data);
                return {
                    fileData: data.data,
                    type: "edit-success"
                }
            case "delete":
                if(!hasServerPermission(client.data.auth.user, server.toJSON(), "serverfiles.delete")) return "No permission";
                let deleteFileStat = await fs.stat(pathToCheck);
                if(!deleteFileStat.isFile()) return;
                logger.log(`${client.data.auth.user?.username} is deleting ${data.path} in ${server.name}`, 'server.file.delete');
                await fs.unlink(pathToCheck);
                return {
                    type: "delete-success"
                }
            case "upload":
                if(!hasServerPermission(client.data.auth.user, server.toJSON(), "serverfiles.upload")) return "no permission to upload";
                let [id, promise] = await requestUpload();
                logger.log(`${client.data.auth.user?.username} is uploading ${data.path} to ${server.name} with upload ID '${id}'`, "server.file.upload");
                if(!(promise instanceof Promise)) return;
                if(typeof id != "string") return;
                promise.then(async buf => {
                    await fs.writeFile(pathToCheck, buf);
                });
                return {
                    type: "uploadConfirm",
                    id
                }
            case "download":
                if(!hasServerPermission(client.data.auth.user, server.toJSON(), "serverfiles.download")) return "no permission to download";
                let downloadID = requestDownload(pathToCheck);
                logger.log(`${client.data.auth.user?.username} is downloading ${data.path} in ${server.name}`, "server.file.download");
                return {
                    type: "downloadConfirm",
                    id: downloadID
                }
        }
    }
}
