import { OurClient } from "../..";
import { Server } from "../../../../Share/Server";
import fs from "node:fs/promises";
import { buildInfo } from "../../../../Share/BuildInfo.js";
import { integratorJarPath } from "../../serverIntegrator.js";
import logger from "../../logger.js";

export default async function install(server: Server, client: OurClient, data: any): Promise<{type: "install-success"}> {
    logger.log(`${client.data.auth.user?.username} is installing the BurgerPanel integrator on server ${server.name}`, "server.integrator");
    await fs.copyFile(integratorJarPath, server.path + `/plugins/BurgerPanelIntegrator-${buildInfo.version}.jar`);
    return {
        type: "install-success"
    }
}
