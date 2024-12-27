import { OurClient, Packet, ServerPacketResponse } from "../index.js";
import db, {getServerByID} from "../db.js";
import serverManager from "../serverManager.js";
import { hasServerPermission, userHasAccessToServer } from "../util/permission.js";
import { Request } from "../../../Share/Requests.js";
import logger, { LogLevel } from "../logger.js";

export default class DeleteServer extends Packet {
    name: Request = "deleteServer";
    requiresAuth: boolean = true;
    async handle(client: OurClient, data: any): ServerPacketResponse<"deleteServer"> {
        if(!client.data.auth.user) return;
        // Ensure the server exists
        let server = getServerByID.get(data.id);
        if (!server || !userHasAccessToServer(client.data.auth.user, server)) {
            return "Server does not exist"
        }
        if(!hasServerPermission(client.data.auth.user, server, "delete")) {
            return "No permission"
        }
        logger.log(`${client.data.auth.user.username} deleted ${server.name}`, "server.delete", LogLevel.WARNING);
        db.prepare(`DELETE FROM servers WHERE id=?`).run(data.id);
        await serverManager.stopServer(server, true);
        serverManager.deleteServerFromCache(server);
    }
}