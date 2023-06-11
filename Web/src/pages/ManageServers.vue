<script setup lang="ts">
import { Ref, inject, ref, onMounted, watch } from 'vue';
import { Server, allowedSoftwares } from '../../../Share/Server';
import { User } from '../../../Share/User';
import EventEmitter from '../util/event';
import { RouteLocationNormalized, useRouter } from 'vue-router';
import { getSetting } from '../util/config';
import { hasPermission } from '../../../Share/Permission';
import ServerStatus from "../components/ServerStatus.vue";
import sendRequest from '../util/request';
import { useUser } from '../stores/user';

let router = useRouter();
let events: Ref<typeof EventEmitter> = inject('events') as Ref<typeof EventEmitter>;
let servers: Ref<Server[]> = inject('servers') as Ref<Server[]>;
let user = useUser();
let serverCreatorOpen = ref(false);
let newServerName = ref("");
let newServerMem = ref(0);
let newMCServerVersion = ref("");
let newMCServerSoftware = ref("");
async function checkIfAllServers(currentRoute: RouteLocationNormalized) {
    if (currentRoute.query.all == "true") {
        servers.value = (await sendRequest("getAllServers")).servers;
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
    if(resp?.server) manageServer(resp.server._id);
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
        newServerMem.value = await getSetting("defaultMemory");
        newMCServerVersion.value = await getSetting("defaultMCVersion");
        newMCServerSoftware.value = await getSetting("defaultMCSoftware");
    }
})();
let agreesToEULA = ref(false);
let serverCreating = ref(false);
let newMCServerPort = ref(25565);
</script>
<template>
    <h1>Servers</h1>
        <RouterLink :to="{query: {all: 'true'}}"><button v-if="!(router.currentRoute.value.query.all == 'true') && user.hasPermission('servers.all.view')">Show all servers</button></RouterLink>
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
    <div v-if="servers.length != 0">
        <table>
            <tr>
                <th>Name</th>
                <th>Memory</th>
                <th>Path</th>
                <th>Port</th>
                <th>Status</th>
                <th>Manage</th>
            </tr>
            <tr v-for="server in servers">
                <td>{{ server.name }}</td>
                <td>{{ server.mem }} MB</td>
                <td>{{ server.path }}</td>
                <td>{{ server.port }}</td>
                <td><ServerStatus :server="server._id"/></td>
                <td><RouterLink :to="{name: 'manageServer', params: {server: server._id}}"><button>Manage</button></RouterLink></td>
            </tr>
        </table>
    </div>
    <p v-if="servers.length === 0">There are no servers for you to manage.</p>
</template>

<style scoped>
table {
    width: 100%;
}
table > tr > th {
    /* Center */
    text-align: left;
    margin-left: 100;
}
td, th, .manage-btn {
  border: 1px solid #dddddd;
  text-align: left;
  padding: 8px;
}
tr:nth-child(even) {
  background-color: #383535;
}
</style>