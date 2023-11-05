const isProd = process.env.NODE_ENV == "production";
import fsSync from "node:fs";
import net from "node:net";
import path from "node:path";
import logger, { LogLevel } from "./logger.js";
import type { Server } from "../../Share/Server.js";
interface OurIntegratorClient extends net.Socket {
    burgerpanelData: {
        server?: string
    }
}
export default new class ServerIntegrator {
    path: string | undefined;
    filename = "connector.burgerpanelsock";
    requestCallbacks: {
        [id: string]: (resp: any) => void
    } = {};
    server: net.Server = undefined as any as net.Server;
    servers: {
        [id: string]: {
            server: Server,
            client?: OurIntegratorClient
        }
    } = {};
    constructor() {
        this.path = this.getPath();
        if(!this.path) return;
        if(fsSync.existsSync(this.path)) fsSync.rmSync(this.path);
        this.listen();
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
                    console.log(json);
                    if(!this.requestCallbacks[json.id]) return;
                    this.requestCallbacks[json.id](json.data);
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
            server
        };
    }
}
