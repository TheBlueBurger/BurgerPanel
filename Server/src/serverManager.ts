import { Server } from "../../Share/Server.js"
import { OurClient } from "."
import { ChildProcess, spawn } from "node:child_process"
import { User } from "../../Share/User";
import fs from "node:fs/promises";
import { getSetting } from "./config.js";
import { servers } from "./db.js";
import { exists } from "./util/exists.js";
export let allowedSoftwares = ["purpur", "paper", "vanilla"];
export default new class ServerManager {
    servers: {
        [key: string]: { // Server ID. _id from the database
            server: Server;
            clientsAttached: OurClient[];
            childProcess?: ChildProcess;
            lastLogs: string[];
        }
    } = {};
    constructor() {

    }
    async setupServer(server: Server) {
        if (!this.servers[server._id]) this.createServerEntry(server);
        let path = server.path;
        await fs.mkdir(path, {
            recursive: true
        });
        let items = await fs.readdir(path);
        if (items.includes("server.jar")) return;
        // Download the server jar
        let downloadURL: string = "";
        switch (server.software) {
            case "paper":
                let paperAPIResp = await (await fetch(`https://api.papermc.io/v2/projects/paper/versions/${server.version}/builds/`)).json();
                let builds = paperAPIResp?.builds;
                if (!builds) throw new Error("Invalid response from papermc.io. Missing '.builds'.");
                let latestBuild = builds[builds.length - 1];
                if (!latestBuild?.downloads?.application?.name) throw new Error("Invalid response from papermc.io. Missing '.downloads.application.name'.");
                downloadURL = `https://papermc.io/api/v2/projects/paper/versions/${server.version}/builds/${latestBuild.build}/downloads/${latestBuild.downloads.application.name}`;
                break;
            case "purpur":
                downloadURL = `https://api.purpurmc.org/v2/purpur/${server.version}/latest/download`;
                break;
            case "vanilla":
                let manifest = await (await fetch("https://launchermeta.mojang.com/mc/game/version_manifest.json")).json();
                let version = manifest?.versions?.find((v: any) => v.id == server.version);
                if (!version) throw new Error("Invalid response from mojang. Could not find version.");
                let versionManifest = await (await fetch(version.url)).json();
                downloadURL = versionManifest?.downloads?.server?.url;
                if (!downloadURL) throw new Error("Invalid response from mojang. Could not find server download URL.");
                break;
            default:
                throw new Error("Invalid server software.");
        }
        let jar = await fetch(downloadURL);
        if (!jar.ok || !jar.body) throw new Error("Failed to download server jar.");
        let jarBuffer = await jar.arrayBuffer();
        await fs.writeFile(path + "/server.jar", Buffer.from(jarBuffer));
        // Create the eula.txt file
        await fs.writeFile(path + "/eula.txt", "eula=true\n");
        await fs.writeFile(path + "/server.properties", `server-port=${server.port}
enforce-secure-profile=false
`);
    }
    createServerEntry(server: Server) {
        this.servers[server._id] = {
            server,
            clientsAttached: [],
            lastLogs: [],
        }
    }
    attachClientToServer(client: OurClient, server: Server) {
        if (!this.servers[server._id]) this.createServerEntry(server);
        this.servers[server._id].clientsAttached.push(client);
        return {
            lastLogs: this.servers[server._id].lastLogs,
        }
    }
    private handleServerLog(server: Server, data: string) {
        this.servers[server._id].clientsAttached.forEach(c => {
            c.json({
                type: "serverOutput",
                emitEvent: true,
                emits: ["serverOutput-" + server._id],
                server: server._id,
                data: data.toString()
            });
        });
        let serverEntry = this.servers[server._id];
        serverEntry.lastLogs.push(data.toString());
        while (serverEntry.lastLogs.length > 100) serverEntry.lastLogs.shift();
    }
    async startServer(server: Server) {
        if (!this.servers[server._id]) this.createServerEntry(server);
        await this.setupServer(server);
        let serverEntry = this.servers[server._id];
        if (serverEntry.childProcess) throw new Error("Server is already running: " + server._id);
        let childProcess = spawn("java", ["-Xms" + server.mem + "M", "-Xmx" + server.mem + "M", "-jar", "server.jar", "--nogui"], {
            cwd: server.path,
            stdio: "pipe",
        });
        serverEntry.childProcess = childProcess;
        childProcess.stdout.on("data", d => this.handleServerLog(server, d.toString()));
        childProcess.stderr.on("data", d => this.handleServerLog(server, d.toString()));
        childProcess.on("error", err => {
            console.log("Server " + server._id + " errored: " + err);
            serverEntry.childProcess = undefined;
            serverEntry.clientsAttached.forEach(client => {
                client.json({
                    type: "serverErrored",
                    emitEvent: true,
                    emits: ["serverErrored-" + server._id],
                    server: server._id,
                    message: err?.message || "Unknown message?!?!?",
                })
            });
        })
        childProcess.once("exit", c => {
            console.log("Server " + server._id + " exited with code " + c);
            serverEntry.lastLogs.push("Server exited with code " + c + "\n");
            serverEntry.childProcess = undefined;
            serverEntry.clientsAttached.forEach(client => {
                client.json({
                    type: "serverExited",
                    emitEvent: true,
                    emits: ["serverExited-" + server._id],
                    server: server._id,
                    code: c,
                })
            });
        })
    }
    stopServer(server: Server) {
        return new Promise<void>(async resolve => {
            let startTimestamp = Date.now();
            let serverEntry = this.servers[server._id];
            if (!serverEntry.childProcess) return resolve();
            let timeToWait = await getSetting("stopServerTimeout");
            let timeout = setTimeout(() => {
                console.log("Server " + server._id + " did not stop in time. Killing...");
                this.killServer(server);
                resolve();
            }, timeToWait as number);
            serverEntry.childProcess.once("exit", () => {
                clearTimeout(timeout);
                console.log("Server " + server._id + " stopped in " + (Date.now() - startTimestamp) + "ms");
                resolve();
            });
            if (process.platform != "win32") serverEntry.childProcess.kill("SIGTERM");
            else serverEntry.childProcess.stdin?.write("stop\nend\n");
            console.log(`Waiting for ${server.name} (${server._id}) to stop...`);
        })
    }
    killServer(server: Server) {
        let serverEntry = this.servers[server._id];
        if (!serverEntry.childProcess) throw new Error("Server is not running: " + server._id);
        serverEntry.childProcess.kill("SIGKILL");
    }
    async stopAllServers() {
        await Promise.all(Object.values(this.servers).map(s => this.stopServer(s.server)));
    }
    detachFromServer(client: OurClient, server: string) {
        let serverEntry = this.servers[server];
        if (!serverEntry) return;
        serverEntry.clientsAttached = serverEntry.clientsAttached.filter(c => c !== client);
    }
    writeToConsole(server: Server, command: string, user: User | undefined) {
        let serverEntry = this.servers[server._id];
        if (!serverEntry.childProcess) throw new Error("Server is not running: " + server._id);
        if (!serverEntry.childProcess.stdin) throw new Error("Stdin doesnt exist? This should NEVER HAPPEN: " + server._id);
        serverEntry.childProcess.stdin.write(command + "\n");
        this.handleServerLog(server, `${user?.username ? user.username + " [" + user._id + "] " : ""}> ${command}\n`);
    }
    async changePort(server: Server, port: number) {
        let serverEntry = this.servers[server._id];
        if (serverEntry && serverEntry.childProcess) throw new Error("Server is running. Please stop it before changing the port.");
        // Ensure it is a valid port
        if (typeof port == "string") port = parseInt(port);
        if (port < 1 || port > 65535 || isNaN(port)) throw new Error("Invalid port.");
        // Ensure it is not already in use
        if (!exists(server.path + "/server.properties")) throw new Error("server.properties does not exist.");
        // Update the server.properties file
        let fileData = await fs.readFile(server.path + "/server.properties", "utf8");
        fileData = fileData.replace(/server-port=[0-9]+/g, "server-port=" + port);
        await fs.writeFile(server.path + "/server.properties", fileData);
    }
    async editVersion(server: Server, version: string) {
        let serverEntry = this.servers[server._id];
        if (serverEntry?.childProcess) throw new Error("Server is running. Please stop it before changing the version.");
        await fs.rm(server.path + "/server.jar", { force: true });
        await servers.findByIdAndUpdate(server._id, { $set: { version } }).exec();
    }
    async editSoftware(server: Server, software: string) {
        if (!allowedSoftwares.includes(software)) throw new Error("Invalid software: " + software);
        let serverEntry = this.servers[server._id];
        if (serverEntry?.childProcess) throw new Error("Server is running. Please stop it before changing the software.");
        await fs.rm(server.path + "/server.jar", { force: true });
        await servers.findByIdAndUpdate(server._id, { $set: { software } }).exec();
    }
    deleteServerFromCache(server: Server) {
        if (this.servers[server._id]) delete this.servers[server._id];
    }
    async autoStartServers() {
        console.log("Autostarting servers...");
        let serversToStart = await servers.find({ autoStart: true }).exec();
        await Promise.all(serversToStart.map(async s => {
            await this.setupServer(s.toJSON());
            this.startServer(s.toJSON())
        }));
    }
}
export function userHasAccessToServer(user: User | undefined, server: Server) {
    if (!user) return false;
    if(typeof user._id != "string") user._id = (user._id as string).toString(); // mongodb stupidness
    return server.allowedUsers.includes(user._id) || user.admin;
}