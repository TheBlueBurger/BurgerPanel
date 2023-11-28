const isProd = process.env.NODE_ENV == "production";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import logger, { LogLevel } from "./logger.js";
import type { Server } from "../../Share/Server.js";
import { buildInfo } from "../../Share/BuildInfo.js";
import nodeCrypto from "node:crypto";
import url from "node:url";
let __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export let integratorJarPath: string;
if(process.env.NODE_ENV == "production") integratorJarPath = __dirname + "/Integrator.jar";
else integratorJarPath = __dirname + "/../../../../Integrator/build/libs/BurgerPanelIntegrator-1.0-SNAPSHOT.jar";
interface OurIntegratorClient extends net.Socket {
    burgerpanelData: {
        server?: string
    }
}
export default new class ServerIntegrator {
    path: string | undefined;
    filename = "connector.burgerpanelsock";
    requestCallbacks: {
        [serverID: string]: {
            [id: string]: (resp: any) => void
        }
    } = {};
    server: net.Server = undefined as any as net.Server;
    servers: {
        [id: string]: {
            server: Server,
            client?: OurIntegratorClient,
            cachedResponses: {
                [name: string]: {
                    data: any,
                    expiresAt: number
                }
            }
        }
    } = {};
    constructor() {
        this.path = this.getPath();
        if(!this.path) return;
        if(fsSync.existsSync(this.path)) fsSync.rmSync(this.path);
        this.listen();
    }
    async updateIntegratorIfNeeded(server: Server) {
        let files: string[];
        try {
            files = await fs.readdir(server.path + "/plugins/");
        } catch {
            return;
        }
        let currentIntegratorFilename = files.find(f => f.startsWith("BurgerPanelIntegrator-") && f.endsWith(".jar"));
        if(!currentIntegratorFilename) return;
        if(currentIntegratorFilename == `BurgerPanelIntegrator-${buildInfo.gitHash}.jar`) return;
        logger.log(`Autoupdating BurgerPanel integrator on server ${server.name}`, "server.integrator")
        await fs.unlink(server.path + "/plugins/" + currentIntegratorFilename);
        await fs.copyFile(integratorJarPath, server.path + "/plugins/" + `BurgerPanelIntegrator-${buildInfo.gitHash}.jar`);
    }
    getPath() {
        if(process.platform == "win32") {
            logger.log("Integrator cannot be used because microsoft", "debug", LogLevel.DEBUG);
            return;
        }
        if(process.env.BURGERPANEL_INTEGRATOR_SOCKET_PATH) return process.env.BURGERPANEL_INTEGRATOR_SOCKET_PATH;
        return path.join(process.cwd(), this.filename);
    }
    private listen() {
        let server = net.createServer(_c => {
            let c = _c as OurIntegratorClient;
            c.burgerpanelData = {};
            c.on("close", () => {
                if(c.burgerpanelData.server) delete this.servers[c.burgerpanelData.server];
            });
            c.on("data", d => {
                let json;
                try {
                    json = JSON.parse(d.toString());
                } catch(err) {
                    logger.log(`Client sent invalid JSON, server id is ${c.burgerpanelData.server}: ${d.toString()}`, "server.integrator", LogLevel.ERROR);
                    return;
                }
                if(Array.isArray(json)) return;
                if(!["request", "response"].includes(json.dataType)) return;
                if(json.dataType == "response") {
                    console.log(JSON.stringify(json, null, 2));
                    if(!c.burgerpanelData.server) return;
                    if(!this.requestCallbacks[c.burgerpanelData.server] || !this.requestCallbacks[c.burgerpanelData.server][json.id]) return;
                    this.requestCallbacks[c.burgerpanelData.server][json.id](json.data);
                    return;
                }
                // todo: proper handler
                switch(json.type) {
                    case "setID":
                        if(!this.servers[json.id]) return;
                        c.burgerpanelData.server = json.id;
                        this.servers[json.id].client = c;
                        logger.log(`Server ${json.id} connected`, "server.integrator");
                        c.write(JSON.stringify({
                            id: "among",
                            packet: "status",
                            data: {

                            }
                        }));
                        break;
                }
            });
        });
        this.server = server;
        server.listen(this.path);
    }
    prepareServer(server: Server) {
        this.servers[server._id] = {
            server,
            cachedResponses: {}
        };
        this.requestCallbacks[server._id] = {};
    }
    findUnusedID(server: Server): string {
        for(let i = 0; i < 100; i++) {
            let str = nodeCrypto.randomBytes(30).toString("base64url");
            if(this.requestCallbacks[server._id][str]) continue;
            return str;
        }
        throw new Error("somehow didnt find a id in 100 tries");
    }
    request(server: Server, packet: string, data: any = {}, useCache: boolean = false): Promise<any> {
        if(!this.isReadyForRequests(server)) throw new Error("Server isn't ready for requests!");
        const client = this.servers[server._id].client;
        if(!client) throw new Error("bad");
        if(useCache) {
            const cachedResponses = this.servers[server._id]?.cachedResponses;
            if(cachedResponses && cachedResponses[packet] && Date.now() < cachedResponses[packet].expiresAt) return Promise.resolve(cachedResponses[packet].data);
        }
        let id = this.findUnusedID(server);
        let toSend = JSON.stringify({
            id,
            packet,
            data
        });
        console.log("Sending", toSend);
        client.write(toSend);
        return new Promise((res, rej) => {
            let timeout = setTimeout(() => {
                delete this.requestCallbacks[server._id][id];
                rej("Request timed out");
            }, 10_000);
            this.requestCallbacks[server._id][id] = (d) => {
                delete this.requestCallbacks[server._id][id];
                clearTimeout(timeout);
                if(useCache) this.servers[server._id].cachedResponses[packet] = {
                    expiresAt: Date.now() + 5000,
                    data: d
                }
                res(d);
            }
        });
    }
    isReadyForRequests(server: Server) {
        const client = this.servers[server._id]?.client;
        if(!client) return false;
        return true;
    }
}
