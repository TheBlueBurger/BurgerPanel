import type { Server } from '../../../Share/Server';
import events from './event';
export default async function getServerByID(cachedServers: Server[] | null, id: string, ignoreCache: boolean = false) {
    if(cachedServers && !ignoreCache) {
        const server = cachedServers.find(s => s._id === id);
        if (server) return server;
    }
    events.emit("sendPacket", {
        type: "getServer",
        id
    })
    let resp = await events.awaitEvent("getServer-" + id);
    if(!resp.success) throw new Error("Unable to get server: " + resp.message);
    return resp.server;
}