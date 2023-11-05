const isProd = process.env.NODE_ENV == "production";
import fsSync from "node:fs";
import net from "node:net";
import url from "node:url";
import fs from "node:fs/promises";
import logger, { LogLevel } from "./logger.js";
import type { Server } from "../../Share/Server.js";
interface OurIntegratorClient extends net.Socket {
    burgerpanelData: {
        server?: string
    }
}
let __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export default new class ServerIntegrator {
    path = (isProd ? __dirname : process.cwd()) + "/connector.burgerpanelsock";
    requestCallbacks: {
        [id: string]: (resp: any) => void
    } = {};
    server: net.Server = undefined as any as net.Server;
    servers: {
        [id: string]: {
            server: Server,
            client?: net.Socket
        }
    } = {};
    constructor() {
        if(fsSync.existsSync(this.path)) fsSync.rmSync(this.path);
        this.listen();
    }
    private listen() {
        let server = net.createServer(_c => {
            let c = _c as OurIntegratorClient;
            c.burgerpanelData = {};
            c.on("data", d => {
                let json;
                try {
                    json = JSON.parse(d.toString());
                } catch(err) {
                    logger.log(`Client sent invalid JSON, server id is ${c.burgerpanelData.server}`, "server.integrator", LogLevel.ERROR);
                    return;
                }
                if(Array.isArray(json)) return;
                if(!["request", "response"].includes(json.dataType)) return;
                if(json.dataType == "response") {
                    if(!this.requestCallbacks[json.id]) return;
                    this.requestCallbacks[json.id](json.data);
                    return;
                }
                // todo: proper handler
                switch(json.type) {
                    case "setID":
                        if(!this.servers[json.id]) return;
                        c.burgerpanelData.server = json.id;
                        logger.log(`Server ${json.id} connected`, "server.integrator");
                        break;
                }
            });
        });
        this.server = server;
        server.listen(this.path);
    }
    prepareServer(server: Server) {
        this.servers[server._id] = {
            server
        };
    }
}
