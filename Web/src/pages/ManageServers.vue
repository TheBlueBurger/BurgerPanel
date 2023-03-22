<script setup lang="ts">
import { Ref, inject, ref, onMounted, watch } from 'vue';
import { Server } from '../../../Share/Server';
import { User } from '../../../Share/User';
import EventEmitter from '../util/event';
import { RouteLocationNormalized, useRouter } from 'vue-router';
import { getSetting } from '../util/config';
let router = useRouter();
let events: Ref<typeof EventEmitter> = inject('events') as Ref<typeof EventEmitter>;
let servers: Ref<Server[]> = inject('servers') as Ref<Server[]>;
let loginStatus: Ref<User> = inject('loginStatus') as Ref<User>;
let serverCreatorOpen = ref(false);
let newServerName = ref("");
let newServerMem = ref(0);
let newMCServerVersion = ref("");
let newMCServerSoftware = ref("");
function showAllServers() {
    router.push({
        query: {
            all: "true"
        }
    })
}
async function checkIfAllServers(currentRoute: RouteLocationNormalized) {
    if (currentRoute.query.all == "true") {
        events.value.emit("sendPacket", {
            type: "getAllServers"
        });
        let resp = await events.value.awaitEvent("getAllServers");
        if (resp?.success) {
            servers.value = resp.servers;
        } else {
            alert("Failed to get servers: " + resp.message);
        }
    }
}
onMounted(() => {
    checkIfAllServers(router.currentRoute.value);
})
watch(router.currentRoute, checkIfAllServers)
async function createServer() {
    if(!agreesToEULA.value) {
        events.value.emit("createNotification", "You must agree to the EULA to create a server.");
        return;
    }
    serverCreating.value = true;
    events.value.emit("createNotification", "Creating server...")
    events.value.emit("sendPacket", {
        type: "createServer",
        name: newServerName.value,
        mem: newServerMem.value,
        version: newMCServerVersion.value,
        software: newMCServerSoftware.value,
        port: newMCServerPort.value
    });
    let resp = await events.value.awaitEvent("createServer");
    if (resp?.success) {
        events.value.emit("createNotification", "Server successfully created!");
        manageServer(resp.server._id)
    } else {
        events.value.emit("createNotification", "Failed to create server: " + resp.message);
        serverCreating.value = false;
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
    if(loginStatus.value.admin) {
        newServerMem.value = await getSetting("defaultMemory");
        newMCServerVersion.value = await getSetting("defaultMCVersion");
        newMCServerSoftware.value = await getSetting("defaultMCSoftware");
    }
})();
let agreesToEULA = ref(false);
let serverCreating = ref(false);
let newMCServerPort = ref(25565);
function importServer() {
    router.push({
        name: "importServer"
    });
}
</script>
<template>
    <h1>Servers</h1>
    <div v-if="loginStatus?.admin">
            <h2>Admin</h2>
            <p>Admins can create servers and manage all servers.</p>
            <button @click="showAllServers" v-if="!(router.currentRoute.value.query.all == 'true')">Show all servers</button>
            <button @click="serverCreatorOpen = !serverCreatorOpen">Create server {{ serverCreatorOpen ? "∧" : "V" }}</button>
            <button @click="importServer">Import server</button>
    </div>
    <div id="create-server" v-if="serverCreatorOpen">
        <h2>Create server</h2>
        <form>
            Name: <input type="text" v-model="newServerName" /> <br/>
            Memory (MB): <input type="number" v-model="newServerMem" /> <br/>
            Version: <input type="text" v-model="newMCServerVersion" /> <br/>
            Software: <input type="text" v-model="newMCServerSoftware" /> <br/>
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
                <th>Manage</th>
            </tr>
            <tr v-for="server in servers">
                <td>{{ server.name }}</td>
                <td>{{ server.mem }} MB</td>
                <td>{{ server.path }}</td>
                <td>{{ server.port }}</td>
                <td><button @click="manageServer(server._id)">Manage</button></td>
            </tr>
        </table>
    </div>
    <p v-if="servers.length === 0">There are no servers for you to manage.</p>
</template>

<style scoped>
.server {
    margin-top: 5px;
}
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