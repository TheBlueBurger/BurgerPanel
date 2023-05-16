import "./index.js"
import chalk from "chalk";
import {IDs} from "../../Share/Logging.js";
import { getSetting, setSetting } from "./config.js";
import fs from "node:fs";
import fsp from "node:fs/promises";
import url from "node:url";
import path from "node:path";
import { exists } from "./util/exists.js";
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
    private makeNiceDate(replaceColon: boolean = false) {
        let dateString = `${Intl.DateTimeFormat("sv").format()} ${Intl.DateTimeFormat("sv", {hour: "2-digit", hourCycle: "h24", minute: "2-digit", second: "2-digit"}).format()}`
        if(replaceColon) dateString = dateString.replaceAll(":", "-"); // windows moment
        return dateString;
    }
    private async getLogLocation(): Promise<string | null> {
        let logLocationInConfig = await getSetting("logging_logDir");
        if(typeof logLocationInConfig != "string") return null;
        if(logLocationInConfig == "") {
            let logDir = path.join(__dirname, "logs")
            if(!await exists(logDir)) await fsp.mkdir(logDir);
            await setSetting("logging_logDir", logDir);
            logLocationInConfig = logDir;
        } else if(logLocationInConfig == "disabled") {
            return null;
        }
        let filePath = path.join(logLocationInConfig, `BurgerPanel ${this.makeNiceDate(process.platform == "win32")}`);
        if(await exists(filePath + ".log")) { // how would this even trigger it changes every second
            let i = 0;
            while(await exists(filePath + i + ".log")) {
                i++;
            }
            filePath = filePath + i;
        }
        return filePath + ".log";
    }
    async log(message: string, id: IDs, level: LogLevel = LogLevel.INFO, emitWebhook: boolean = true, logToFile: boolean = true, logNoMatterWhat: boolean = false) {
        if(!id) return;
        if(logToFile && this.writeStream?.writable) this.writeStream.write(this.formatLog(message, id, level, false) + "\n");
        console.log(this.formatLog(message, id, level, true));
        if(!logNoMatterWhat && await this.isDisabled(id)) return;
        if(emitWebhook) await this.sendDiscordWebhook(this.formatLog(message, id, level, false)).catch(err => this.log(err, "error", LogLevel.ERROR, false));
    }
    private formatLog(message: string, id?: IDs, level?: LogLevel, useColors?: boolean) {
        let str = `[${LogLevel[level ?? LogLevel.INFO]}] ${id ? id + ": " : ''}${message}`
        return useColors ? colors[level ?? LogLevel.INFO](str) : str
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
                username: "BurgerPanel Logs",
                allowed_mentions: {
                    parse: []
                  }
            } as any)
        }).then(async r => {
            if(!r.ok) this.log(`Error while sending to webhook: Server status code is not OK: ${r.status} ${r.statusText}: ${await r.text()}`, "error", LogLevel.ERROR, false);
        }).catch((err) => {
            this.log("Error while sending to webhook: " + err, "error", LogLevel.ERROR, false);
        });
    }
}