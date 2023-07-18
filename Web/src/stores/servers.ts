import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { Server, ServerStatuses } from "@share/Server";
import { useUser } from "./user";
import sendRequest from "@util/request";

export const useServers = defineStore("servers", () => {
    let servers = ref([] as Server[]);
    let statuses = ref({} as ServerStatuses);
    let assignedServers = computed(() => {
        let user = useUser();
        return servers.value.filter(server => {
            return server.allowedUsers.some(allowedUser => {
                return allowedUser.user == user.user?._id;
            })
        })
    })
    let allServersHaveBeenCached = false;
    async function getServerByID(id: string, disableModalErr: boolean = false) {
        let cachedServer = servers.value.find(s => s._id == id);
        if(cachedServer) return cachedServer;
        // we gotta ask the server for it
        if(allServersHaveBeenCached) throw new Error("Alr cached all servers and couldnt find " + id);
        let server = await sendRequest("getServer", {
            id
        }, !disableModalErr);
        if(server.status) statuses.value[id] = {status: server.status}
        return server.server;
    }
    async function getAllServers(): Promise<Server[]> {
        if(allServersHaveBeenCached) return servers.value;
        let allServers = await sendRequest("getAllServers");
        servers.value = allServers.servers;
        statuses.value = allServers.statuses;
        allServersHaveBeenCached = true;
        return allServers.servers;
    }
    // takes servers as argument, will add them if they dont exist, used when logged into a new account
    function addServers(newServers: Server[]) {
        newServers.forEach(s => {
            if(!servers.value.find(v => v._id == s._id)) servers.value.push(s);
        })
    }
    function addStatuses(newStatuses: ServerStatuses) {
        Object.keys(newStatuses).forEach(status => {
            statuses.value[status] = newStatuses[status];
        })
    }
    function updateServer(server: Server) {
        if(!server._id) throw new Error("Invalid server when updating!");
        removeServerFromCache(server);
        servers.value.push(server);
    }
    function removeServerFromCache(server: Server) {
        servers.value = servers.value.filter(s => s._id != server._id);
    }
    async function getPinnedServers() {
        let user = useUser();
        let pins = user.user?.pins;
        if(!pins) return [];
        let pinnedServers = await Promise.allSettled(pins.map(p => getServerByID(p, true)));
        if(pinnedServers.some(p => p.status == "rejected")) {
            console.error("Pins are broken! at least one server cannot be found!");
        }
        return pinnedServers.filter(p => p.status == "fulfilled").map(p => {
            if(p.status != "fulfilled") throw new Error("Found rejected pin when they were already filtered!!!");
            return p.value;
        });
    }
    async function togglePin(server: Server) {
        await sendRequest("editUser", {
            id: useUser().user?._id,
            action: "togglePin",
            server: server._id
        })
    }
    function isPinned(server: Server) {
        let pins = useUser().user?.pins;
        if(!pins) return false;
        return pins.includes(server._id)
    }
    return {servers, getServerByID, assignedServers, statuses, getAllServers, addServers, addStatuses, updateServer, removeServerFromCache, getPinnedServers, togglePin, isPinned}
});