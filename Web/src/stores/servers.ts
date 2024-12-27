import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { Server, ServerStatuses } from "@share/Server";
import { useUser } from "./user";
import sendRequest from "@util/request";
import { ServerPermissions } from "@share/Permission";
type MinimalServer = {name: string, id: number};
type ServerPerm = {id: number, permissions: ServerPermissions[]}
export const useServers = defineStore("servers", () => {
    let servers = ref([] as Server[]);
    let minimalServers = ref([] as MinimalServer[]);
    let statuses = ref({} as ServerStatuses);
    let pins = ref([] as MinimalServer[]);
    let serverPerms = ref(new Map<number, ServerPermissions[]>());
    let assignedServers = computed(() => {
        //let user = useUser();
        return servers.value/*.value.filter(server => {
            return server.allowedUsers.some(allowedUser => {
                return allowedUser.user == user.user?.id;
            })
        })*/
    })
    let allServersHaveBeenCached = false;
    async function getServerByID(id: number | string, disableModalErr: boolean = false) {
        const usedID = typeof id == "string" ? parseInt(id) : id;
        let cachedServer = servers.value.find(s => s.id == usedID);
        if(cachedServer) return cachedServer;
        // we gotta ask the server for it
        if(allServersHaveBeenCached) throw new Error("Already cached all servers and couldn't find " + usedID);
        let server = await sendRequest("getServer", {
            id: usedID
        }, !disableModalErr);
        if(server.status) statuses.value[usedID] = {status: server.status}
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
            if(!servers.value.find(v => v.id == s.id)) servers.value.push(s);
        })
    }
    function addServersWithPerms(newServers: (Server & {permissions: string})[]) {
        newServers.forEach(s => {
            const serverWithoutPerms = {
                ...s,
                permissions: undefined
            } as Server;
            if(!servers.value.find(v => v.id == s.id)) servers.value.push(serverWithoutPerms);
            serverPerms.value.set(s.id, JSON.parse(s.permissions) as ServerPermissions[]);
        });
    }
    function addStatuses(newStatuses: ServerStatuses) {
        Object.keys(newStatuses).forEach(status => {
            statuses.value[status] = newStatuses[status];
        })
    }
    function updateServer(server: Server) {
        if(!server.id) throw new Error("Invalid server when updating!");
        removeServerFromCache(server.id);
        servers.value.push(server);
    }
    function removeServerFromCache(server: number) {
        servers.value = servers.value.filter(s => s.id != server);
        minimalServers.value = minimalServers.value.filter(s => s.id != server);
        serverPerms.value.delete(server);
    }
    async function getPinnedServers() {
        const out = [] as Server[];
        await Promise.all(pins.value.map(async s => out.push(await getServerByID(s.id))));
        return out;
        //return pins;
    }
    async function togglePin(server: Server) {
        const result = await sendRequest("editUser", {
            id: useUser().user?.id,
            action: "togglePin",
            server: server.id
        });
        if(result.pinStatus) pins.value.push({name: server.name, id: server.id});
        else pins.value = pins.value.filter(s => s.id != server.id);
    }
    function isPinned(server: Server) {
        return pins.value.some(a => a.id == server.id);
    }
    function setPins(newPins: MinimalServer[]) {
        addMinimalServers(newPins);
        pins.value = newPins;
    }
    function addMinimalServers(newServers: MinimalServer[]) {
        newServers.forEach(newServer => {
            if(minimalServers.value.some(s => s.id == newServer.id)) return;
            minimalServers.value.push(newServer);
        })
    }
    return {servers, getServerByID, assignedServers, statuses, getAllServers, addServers, addStatuses, updateServer, removeServerFromCache, getPinnedServers, togglePin, isPinned, setPins, addMinimalServers, minimalServers, addServersWithPerms, serverPerms}
});