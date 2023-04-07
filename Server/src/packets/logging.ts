import { OurClient, Packet } from "../index.js";
import { Permission } from "../../../Share/Permission.js";
import logger, { LogLevel } from "../logger.js";
import { IDs } from "../../../Share/Logging.js";
import { getSetting, setSetting } from "../config.js";

export default class Logging extends Packet {
    name: string = "logging";
    requiresAuth: boolean = true;
    permission: Permission = "settings.logging.set";
    async handle(client: OurClient, data: any) {
        if(data.setLoggingTypeEnabled) {
            if(!IDs.includes(data.id)) return;
            if(typeof data.enabled != "boolean") return;
            let _disabledIDs = await getSetting("logging_DisabledIDs");
            let disabledIDs = _disabledIDs?.toString().split(",");
            if(typeof disabledIDs == "undefined") return;
            if(data.enabled) {
                disabledIDs = disabledIDs?.filter(i => data.id != i);
                await logger.log(`${client.data.auth.user?.username} is enabling the logging of ${data.id}`, "logging.change", LogLevel.WARNING);
                await setSetting("logging_DisabledIDs", disabledIDs?.join(",") || "");
            } else {
                if(disabledIDs?.includes(data.id)) return;
                disabledIDs.push(data.id);
                if(disabledIDs[0] === "") disabledIDs.shift();
                await logger.log(`${client.data.auth.user?.username} is disabling the logging of ${data.id}`, "logging.change", LogLevel.WARNING);
                await setSetting("logging_DisabledIDs", disabledIDs?.join(",") || "");
            }
        } else if(data.setWebhookURL) {
            if(typeof data.url != "string") return;
            await logger.log(`${client.data.auth.user?.username} is changing the logging URL to ${data.url}`, "logging.change", LogLevel.WARNING);
            await setSetting("logging_DiscordWebHookURL", data.url);
        } else if(data.setLogFileLocation) {
            if(typeof data.location != "string") return;
            await logger.log(`${client.data.auth.user?.username} is changing the log location to ${data.location}`, "logging.change", LogLevel.WARNING);
            await setSetting("logging_logFile", data.location);
        }
        client.json({
            type: "logging",
            success: true,
            emitEvent: true
        });
    }
}
