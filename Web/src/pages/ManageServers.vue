<script setup lang="ts">
import { Ref, inject, ref, onMounted, watch, computed } from 'vue';
import { Server, allowedSoftwares } from '@share/Server';
import EventEmitter from '@util/event';
import { RouteLocationNormalized, useRouter } from 'vue-router';
import sendRequest from '@util/request';
import { useUser } from '@stores/user';
import { useServers } from '@stores/servers';
import { useSettings } from '@stores/settings';
import ServerVue from '@components/Server.vue';

let settings = useSettings();
let router = useRouter();
let events: Ref<typeof EventEmitter> = inject('events') as Ref<typeof EventEmitter>;
let servers = useServers();
let user = useUser();
let serverCreatorOpen = ref(false);
let newServerName = ref("");
let newServerMem = ref(0);
let newMCServerVersion = ref("");
let newMCServerSoftware = ref("");
let allServers = ref([] as Server[]);
let usedServers = computed(() => {
    if(router.currentRoute.value.query.all == "true" && allServers.value) {
        return allServers.value;
    }
    return servers.assignedServers;
})
async function checkIfAllServers(currentRoute: RouteLocationNormalized) {
    if (currentRoute.query.all == "true") {
        allServers.value = (await servers.getAllServers());
    }
}
onMounted(() => {
    checkIfAllServers(router.currentRoute.value);
})
watch(router.currentRoute, checkIfAllServers);

async function createServer() {
    if(!agreesToEULA.value) {
        events.value.emit("createNotification", "You must agree to the EULA to create a server.");
        return;
    }
    serverCreating.value = true;
    events.value.emit("createNotification", "Creating server...")
    let resp = await sendRequest("createServer", {
        name: newServerName.value,
        mem: newServerMem.value,
        version: newMCServerVersion.value,
        software: newMCServerSoftware.value,
        port: newMCServerPort.value
    }).catch(err => {
        serverCreating.value = false;
    });
    if(resp?.server) {
        servers.updateServer(resp.server);
        manageServer(resp.server._id);
    }
}
function manageServer(id: string) {
    router.push({
        name: "manageServer",
        params: {
            server: id
        }
    });
}
(async() => {
    if(user.hasPermission("settings.read")) {
        await Promise.all([
            (async() => {
                newServerMem.value = await settings.getSetting("defaultMemory");
            })(),
            (async() => {
                newMCServerVersion.value = await settings.getSetting("defaultMCVersion");
            })(),
            (async() => {
                newMCServerSoftware.value = await settings.getSetting("defaultMCSoftware");
            })()
        ])
    }
})();
let agreesToEULA = ref(false);
let serverCreating = ref(false);
let newMCServerPort = ref(25565);
</script>
<template>
    <h1>Servers</h1>
        <RouterLink :to="{query: {all: 'true'}}"><button v-if="router.currentRoute.value.query.all != 'true' && user.hasPermission('servers.all.view')">Show all servers</button></RouterLink>
        <RouterLink v-if="router.currentRoute.value.query.all == 'true'" :to="{query: {}}"><button>Show only my servers</button></RouterLink>
        <button @click="serverCreatorOpen = !serverCreatorOpen" v-if="user.hasPermission('servers.create')">Create server {{ serverCreatorOpen ? "∧" : "V" }}</button>
        <RouterLink :to="{name: 'importServer'}"><button v-if="user.hasPermission('servers.import')">Import server</button></RouterLink>
    <div id="create-server" v-if="serverCreatorOpen && user.hasPermission('servers.create')">
        <h2>Create server</h2>
        <form>
            Name: <input type="text" v-model="newServerName" /> <br/>
            Memory (MB): <input type="number" v-model="newServerMem" /> <br/>
            Version: <input type="text" v-model="newMCServerVersion" /> <br/>
            Software: <select v-model="newMCServerSoftware"><option v-for="software in allowedSoftwares">{{ software }}</option></select> <br/>
            Port: <input type="number" v-model="newMCServerPort" /> <br/>
            I agree to the <a target="_blank" href="https://www.minecraft.net/en-us/eula">Minecraft End User License Agreement</a> <input type="checkbox" v-model="agreesToEULA"> <br/>
            <button type="submit" @click.prevent="createServer" :disabled="serverCreating">Create</button>
        </form>
    </div>
    <div id="servers-container">
        <ServerVue v-for="server of usedServers" :server="server" />
    </div>
    <p v-if="usedServers.length === 0">There are no servers for you to manage.{{ (!(router.currentRoute.value.query.all == 'true') && user.hasPermission('servers.all.view')) ? " You can click 'Show all servers' to see all servers on the server." : '' }}</p>
</template>

<style scoped>

    #servers-container {
        display: flex;
        flex-wrap:wrap;
        justify-content: center;
    }
</style>