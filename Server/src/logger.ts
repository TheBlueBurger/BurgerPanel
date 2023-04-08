import "./index.js"
import chalk from "chalk";
import {IDs} from "../../Share/Logging.js";
import { getSetting, setSetting } from "./config.js";
import fs from "node:fs";
import url from "node:url";
import path from "node:path";
export enum LogLevel {
    DEBUG,
    INFO,
    WARNING,
    ERROR
};
let colors: {[level: string]: Function} = {
    [LogLevel.DEBUG]: chalk.gray,
    [LogLevel.INFO]: chalk.greenBright,
    [LogLevel.WARNING]: chalk.yellowBright,
    [LogLevel.ERROR]: chalk.redBright
}
let __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export default new class Logger {
    writeStream: fs.WriteStream | null = null;
    constructor() {
        this.setupWriteStream();
    }
    async setupWriteStream() {
        let location = await this.getLogLocation();
        if(!location) return;
        this.writeStream = fs.createWriteStream(location);
        this.log("Logging to " + location, "info", LogLevel.DEBUG, false, false)
    }
    private async getLogLocation(): Promise<string | null> {
        let logLocationInConfig = await getSetting("logging_logFile");
        if(typeof logLocationInConfig != "string") return null;
        if(logLocationInConfig == "") {
            let newLogLocation = path.join(__dirname, "burgerpanel.log");
            await setSetting("logging_logFile", newLogLocation);
        } else if(logLocationInConfig == "disabled") {
            return null;
        }
        return logLocationInConfig;
    }
    async log(message: string, id?: IDs, level: LogLevel = LogLevel.INFO, emitWebhook: boolean = true, logToFile: boolean = true) {
        if(!id) return;
        if(logToFile && this.writeStream?.writable) this.writeStream.write(this.formatLog(message, id, level, false) + "\n");
        if(await this.isDisabled(id)) return;
        console.log(this.formatLog(message, id, level, true));
        if(emitWebhook) await this.sendDiscordWebhook(this.formatLog(message, id, level, false));
    }
    private formatLog(message: string, id?: IDs, level?: LogLevel, useColors?: boolean) {
        let str = `[${LogLevel[level || LogLevel.INFO]}] ${id ? id + ": " : ''}${message}`
        return useColors ? colors[level || LogLevel.INFO](str) : str
    }
    async isDisabled(id: IDs): Promise<boolean> {
        return (await getSetting("logging_DisabledIDs"))?.toString().split(",").includes(id as string) || false;
    }
    async sendDiscordWebhook(message: string) {
        let discordWebHookURL = await getSetting("logging_DiscordWebHookURL");
        if(!discordWebHookURL) return;
        if(typeof discordWebHookURL != "string" || discordWebHookURL == "disabled") return;
        let headers = new Headers();
        headers.append("Content-Type", "application/json");
        await fetch(discordWebHookURL, {
            method: "post",
            headers,
            body: JSON.stringify({
                content: message,
                username: "BurgerPanel Logs"
            } as any)
        }).then(async r => {
            if(!r.ok) this.log(`Error while sending to webhook: Server status code is not OK: ${r.status} ${r.statusText}: ${await r.text()}`, "error", LogLevel.ERROR, false);
        }).catch((err) => {
            this.log("Error while sending to webhook: " + err, "error", LogLevel.ERROR, false);
        });
    }
}