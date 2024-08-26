import { AllowedSoftware, allowedSoftwares, Server, ServerStatus } from "../../Share/Server.js"
import { clients, OurClient } from "./clients.js"
import { ChildProcess, spawn } from "node:child_process"
import { User } from "../../Share/User.js";
import fs from "node:fs/promises";
import { getSetting } from "./config.js";
import { servers } from "./db.js";
import { exists } from "./util/exists.js";
import { hasServerPermission } from "./util/permission.js";
import { userHasAccessToServer as _userHasAccessToServer } from "../../Share/Permission.js";
import logger, { LogLevel } from "./logger.js";
import isValidMCVersion from "./util/isValidMCVersion.js";
import { promiseSleep } from "blueutilities";
import serverIntegrator from "./serverIntegrator.js";
const bwrapArgs = ["--ro-bind",]
export default new class ServerManager {
    servers: {
        [key: string]: { // Server ID. _id from the database
            server: Server;
            clientsAttached: OurClient[];
            childProcess?: ChildProcess;
            lastLogs: string[];
            stopping: boolean;
        }
    } = {};
    disableServerStart: boolean = false;
    constructor() {

    }
    async setupServer(server: Server) {
        this.createEntryIfNeeded(server);
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
          case "fabric":
                let fabricLoaderVersions = await (await fetch("https://meta.fabricmc.net/v2/versions/loader")).json();
                let fabricInstallerVersions = await (await fetch("https://meta.fabricmc.net/v2/versions/installer")).json();
                downloadURL = `https://meta.fabricmc.net/v2/versions/loader/${server.version}/${fabricLoaderVersions[0].version}/${fabricInstallerVersions[0].version}/server/jar`;
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
        if(!await exists(path + "/server.properties")) await fs.writeFile(path + "/server.properties", `server-port=${server.port}
enforce-secure-profile=false
`);
    }
    createServerEntry(server: Server) {
        this.servers[server._id] = {
            server,
            clientsAttached: [],
            lastLogs: [],
            stopping: false
        }
    }
    createEntryIfNeeded(server: Server, update: boolean = true) {
        if(!this.servers[server._id]) this.createServerEntry(server);
        else if(update) this.servers[server._id].server = server;
    }
    isAttachedToServer(client: OurClient, server: Server) {
        return this.servers[server._id] && this.servers[server._id].clientsAttached.some(c => c.data.clientID == client.data.clientID);
    }
    attachClientToServer(client: OurClient, server: Server) {
        if(client.type != "Websocket") throw new Error("This isnt a real client!");
        this.createEntryIfNeeded(server);
        if(!this.isAttachedToServer(client, server)) this.servers[server._id].clientsAttached.push(client);
        return {
            lastLogs: this.servers[server._id].lastLogs,
        }
    }
    handleServerLog(server: Server, data: string) {
        this.servers[server._id].clientsAttached.forEach(c => {
            c.json({
                type: "serverOutput",
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
        if(this.disableServerStart) return;
        this.createEntryIfNeeded(server);
        await this.setupServer(server);
        let serverEntry = this.servers[server._id];
        if (serverEntry.childProcess) throw new Error("Server is already running: " + server._id);
        let args = ["-Dnojline=true", "-Xms" + server.mem + "M", "-Xmx" + server.mem + "M", "-jar", "server.jar", "--nogui"];
        if(server.useCustomJVMArgs && server.jvmArgs) {
            let jvmArgs = server.jvmArgs.split(" ");
            args = ["-Dnojline=true", "-Xms" + server.mem + "M", "-Xmx" + server.mem + "M", ...jvmArgs];
        }
        serverIntegrator.prepareServer(server);
        await serverIntegrator.updateIntegratorIfNeeded(server);
        let childProcess = spawn("java", args, {
            cwd: server.path,
            stdio: "pipe",
            env: {
                BURGERPANEL_INTEGRATOR_PATH: serverIntegrator.path,
                BURGERPANEL_INTEGRATOR_SERVER_ID: server._id
            }
        });
        serverEntry.childProcess = childProcess;
        childProcess.stdout.on("data", d => this.handleServerLog(server, d.toString()));
        childProcess.stderr.on("data", d => this.handleServerLog(server, d.toString()));
        childProcess.on("error", err => {
            logger.log("Server " + server._id + " had a error: " + err, "error", LogLevel.ERROR);
            serverEntry.childProcess = undefined;
            serverEntry.clientsAttached.forEach(client => {
                client.json({
                    type: "serverErrored",
                    emits: ["serverErrored-" + server._id],
                    server: server._id,
                    error: err?.message || "Unknown message?!?!?",
                });
                serverEntry.childProcess = undefined;
                this.updateStatus(server);
            });
            this.handleAutorestart(server, 20_000);
        });
        childProcess.once("exit", c => {
            logger.log(`Server ${server.name} exited with code ${c}`, "server.stop", LogLevel.DEBUG);
            serverEntry.lastLogs.push("Server exited with code " + c + "\n");
            serverEntry.childProcess = undefined;
            serverEntry.clientsAttached.forEach(client => {
                client.json({
                    type: "serverExited",
                    emits: ["serverExited-" + server._id],
                    server: server._id,
                    code: c,
                })
            });
            this.updateStatus(server);
            this.handleAutorestart(server, 10_000);
        });
        this.updateStatus(server);
        logger.log("Server " + server.name + " started.", "server.start", LogLevel.DEBUG);
    }
    async handleAutorestart(server: Server, timeout?: number) {
        // lets check if it has been updated
        let newServer = await servers.findById(server._id);
        if(!newServer) return logger.log(`Couldn't find the server in the database while handling auto restart. Did the server get deleted? ${server._id} ${server.name}`, "server.autorestart", LogLevel.ERROR);
        if(!newServer.autoRestart) return;
        if(timeout) await promiseSleep(timeout);
        logger.log("Restarting stopped server: " + server.name, "server.autorestart");
        await this.startServer(newServer.toJSON());
    }
    stopServer(server: Server) {
        return new Promise<void>(async resolve => {
            let startTimestamp = Date.now();
            let serverEntry = this.servers[server._id];
            if (!serverEntry.childProcess) return resolve();
            serverEntry.stopping = true;
            this.updateStatus(server);
            let timeToWait = await getSetting("stopServerTimeout");
            let timeout = setTimeout(() => {
                logger.log("Server " + server._id + " did not stop in time. Killing...", "server.stop", LogLevel.DEBUG);
                this.killServer(server);
                resolve();
            }, timeToWait as number);
            serverEntry.childProcess.once("exit", () => {
                clearTimeout(timeout);
                logger.log(`Server ${server._id} stopped in ${Date.now() - startTimestamp}ms`, "server.stop", LogLevel.DEBUG);
                serverEntry.childProcess = undefined;
                serverEntry.stopping = false;
                this.updateStatus(server);
                resolve();
            });
            if (process.platform != "win32") serverEntry.childProcess.kill("SIGTERM"); // windows doesnt have SIGTERM so we need this
            else serverEntry.childProcess.stdin?.write("stop\nend\n");
            logger.log(`Waiting for ${server.name} (${server._id}) to stop...`, "server.stop", LogLevel.DEBUG, false);
        })
    }
    killServer(server: Server) {
        let serverEntry = this.servers[server._id];
        if (!serverEntry.childProcess) throw new Error("Server is not running: " + server._id);
        serverEntry.childProcess.kill("SIGKILL");
        serverEntry.stopping = false;
        serverEntry.childProcess = undefined;
        this.updateStatus(server);
    }
    async stopAllServers() {
        this.disableServerStart = true;
        await Promise.all(Object.values(this.servers).map(s => this.stopServer(s.server)));
    }
    detachFromServer(client: OurClient, server: string) {
        if(client.type != "Websocket") throw new Error("This isnt a real client!");
        let serverEntry = this.servers[server];
        if (!serverEntry) return;
        serverEntry.clientsAttached = serverEntry.clientsAttached.filter(c => c.data.clientID != client.data.clientID);
    }
    writeToConsole(server: Server, command: string, user: User | undefined) {
        if(typeof command != "string") throw new Error("Cannot write to server because it's not a string!");
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
        if (!await exists(server.path + "/server.properties")) throw new Error("server.properties does not exist.");
        // Update the server.properties file
        let fileData = await fs.readFile(server.path + "/server.properties", "utf8");
        fileData = fileData.replace(/server-port=[0-9]+/g, "server-port=" + port);
        await fs.writeFile(server.path + "/server.properties", fileData);
    }
    async editVersion(server: Server, version: string) {
        if(!await isValidMCVersion(version)) throw new Error("Invalid version!");
        let serverEntry = this.servers[server._id];
        if (serverEntry?.childProcess) throw new Error("Server is running. Please stop it before changing the version.");
        await fs.rm(server.path + "/server.jar", { force: true });
        await servers.findByIdAndUpdate(server._id, { version });
    }
    async editSoftware(server: Server, software: AllowedSoftware) {
        if (!allowedSoftwares.includes(software)) throw new Error("Invalid software: " + software);
        let serverEntry = this.servers[server._id];
        if (serverEntry?.childProcess) throw new Error("Server is running. Please stop it before changing the software.");
        await fs.rm(server.path + "/server.jar", { force: true });
        await servers.findByIdAndUpdate(server._id, { software });
    }
    deleteServerFromCache(server: Server) {
        if (this.servers[server._id]) delete this.servers[server._id];
    }
    async autoStartServers() {
        logger.log("Autostarting servers...", "server.autostart", LogLevel.DEBUG);
        let serversToStart = await servers.find({ autoStart: true });
        await Promise.all(serversToStart.map(async s => {
            this.startServer(s.toJSON())
        }));
    }
    updateStatus(server: Server) {
        let status = this.getStatus(server);
        clients.filter(c => hasServerPermission(c.data.auth?.user, server, "status")).forEach(c => c.json({
            n: "serverStatusUpdate",
            status,
            server: server._id
        }));
    }
    getStatus(server: Server): ServerStatus {
        if(this.servers[server._id.toString()]?.childProcess) return this.servers[server._id.toString()].stopping ? "stopping" : "running";
        return "stopped";
    }
    serverIsRunning(server: Server) {
        return !!this.servers[server._id.toString()]?.childProcess
    }
    handleDisconnect(client: OurClient) {
        this.detachFromAll(client);
    }
    detachFromAll(client: OurClient) {
        Object.values(this.servers).filter(s => this.isAttachedToServer(client, s.server)).forEach(s => this.detachFromServer(client, s.server._id.toString()));
    }
}
export function userHasAccessToServer(user: User | undefined, server: Server) {
    return _userHasAccessToServer(user, server);
}
