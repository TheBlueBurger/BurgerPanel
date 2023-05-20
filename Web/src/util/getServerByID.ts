import type { Server } from '../../../Share/Server';
import sendRequest from './request';
export default async function getServerByID(cachedServers: Server[] | null, id: string) {
    if (cachedServers) {
        const server = cachedServers.find(s => s._id === id);
        if (server) return server;
    }
    let resp = await sendRequest("getServer", {id})
    return resp.server;
}
