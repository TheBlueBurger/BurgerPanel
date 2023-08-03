import { hasServerPermission, userHasAccessToServer } from "../../../Share/Permission.js";
import { ModrinthPluginResult } from "../../../Share/Plugin.js";
import { Request } from "../../../Share/Requests.js";
import { servers } from "../db.js";
import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import logger, { LogLevel } from "../logger.js";
import { exists } from "../util/exists.js";
import { getFile, getPluginDetails, getVersions, mrHeaders, search } from "../util/modrinth.js";
import fs from "node:fs/promises";

export default class Plugins extends Packet {
    name: Request = "plugins";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"plugins"> {
        let server = await servers.findById(data.server).exec();
        if(!server || !userHasAccessToServer(client.data.auth.user, server.toJSON())) return "Server not found";
        if(!hasServerPermission(client.data.auth.user, server?.toJSON(), "plugins.download")) return "no permission";
        switch(data.type) {
            case "search":
                if(typeof data.query != "string") return "No query";
                logger.log(`${client.data.auth.user?.username} is searching for plugin '${data.query}' in ${server.name}`, "debug", LogLevel.DEBUG, false);
                let searchResults = await search(data.query, server.version);
                return {
                    type: "searchResults",
                    results: searchResults?.hits as ModrinthPluginResult[]
                }
            case "details":
                if(typeof data.slug != "string") return "No slug";
                logger.log(`${client.data.auth.user?.username} is viewing details for plugin ${data.slug} in ${server.name}`, "debug", LogLevel.DEBUG, false);
                let pluginDetails = await getPluginDetails(data.slug);
                return {
                    type: "pluginDetails",
                    details: pluginDetails
                }
            case "versions":
                if(typeof data.slug != "string") return "No slug";
                logger.log(`${client.data.auth.user?.username} is viewing versions for plugin ${data.slug} in ${server.name}`, "debug", LogLevel.DEBUG, false);
                let pluginVersions = await getVersions(data.slug, server.version);
                return {
                    type: "pluginVersions",
                    versions: pluginVersions
                }
            case "download":
                if(typeof data.version != "string") return "No ver";
                if(typeof data.hash != "string") return "No sha512";
                let file = await getFile(data.version, data.hash);
                if(!file) return "File isnt found";
                if(await exists(server.path + "/plugins/" + file.filename)) return "Already installed!";
                logger.log(`${client.data.auth.user?.username} is downloading plugin ${file.filename} in ${server.name}`, "plugin.download", LogLevel.INFO);
                let jar = await fetch(file.url, {
                    headers: mrHeaders
                });
                if (!jar.ok || !jar.body) "Request isn't OK";
                let jarBuffer = await jar.arrayBuffer();
                await fs.writeFile(server.path + "/plugins/" + file.filename, Buffer.from(jarBuffer));
                return {
                    type: "downloadSuccess"
                }
        }
    }
}