import chalk from "chalk";
import {IDs} from "../../Share/Logging.js";
import { getSetting } from "./config.js";
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
export default new class Logger {
    constructor() {

    }
    async log(message: string, id?: IDs, level: LogLevel = LogLevel.INFO, emitWebhook: boolean = true) {
        if(id && await this.isDisabled(id)) return;
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
        if(typeof discordWebHookURL != "string") return;
        let headers = new Headers();
        headers.append("Content-Type", "application/json");
        await fetch(discordWebHookURL, {
            method: "post",
            headers,
            body: JSON.stringify({
                content: message,
                username: "BurgerPanel Logs"
            } as any)
        });
    }
}