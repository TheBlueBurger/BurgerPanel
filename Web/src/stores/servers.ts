import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { Server, ServerStatuses } from "../../../Share/Server";
import { useUser } from "./user";
import sendRequest from "../util/request";

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
    async function getServerByID(id: string) {
        let cachedServer = servers.value.find(s => s._id == id);
        if(cachedServer) return cachedServer;
        // we gotta ask the server for it
        if(allServersHaveBeenCached) throw new Error("Alr cached all servers and couldnt find " + id);
        let server = await sendRequest("getServer", {
            id
        });
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
    return {servers, getServerByID, assignedServers, statuses, getAllServers, addServers, addStatuses}
});