<script setup lang="ts">
import { Server } from '../../../Share/Server';
import EventEmitter from '../util/event';
import { ref } from 'vue';
import { User } from '../../../Share/User';
import Manage from './Manage.vue';
import { getSetting } from '../util/config';
let props = defineProps<{
    servers: Server[];
    events: typeof EventEmitter;
    loginStatus: User | null;
}>();

let serverCreatorOpen = ref(false);
let newServerName = ref("");
let newServerMem = ref(0);
(async () => { // Dont wait for this to finish. It's not THAT important.
    let mem = await getSetting("defaultMemory");
    if (typeof mem == "number") {
        newServerMem.value = mem;
    }
})()
async function createServer() {
    props.events.emit("sendPacket", {
        type: "createServer",
        name: newServerName.value,
        mem: newServerMem.value
    });
    serverCreatorOpen.value = false;
    let resp = await props.events.awaitEvent("createServer");
    if (resp?.success) {
        alert("Server created");
    } else {
        alert("Failed to create server: " + resp.message);
    }
}
props.events.on("servers-list-opened", () => {
    serverManaging.value = null;
})
let serverManaging = ref(null as Server | null);
</script>
<template>
    <div v-if="serverManaging">
        <Manage :server="serverManaging" :events="events" />
    </div>
    <div v-else>
        <h1>Servers</h1>
        <button v-if="loginStatus?.admin" @click="serverCreatorOpen = !serverCreatorOpen">Create server</button>
        <div id="create-server" v-if="serverCreatorOpen">
            <h2>Create server</h2>
            <form>
                <input type="text" placeholder="Server name" v-model="newServerName" />
                <input type="number" placeholder="Memory (MB)" v-model="newServerMem" />
                <button type="submit" @click="createServer">Create</button>
            </form>
        </div>
        <div v-if="props.servers.length != 0">
            <table>
                <tr>
                    <th>Name</th>
                    <th>Memory</th>
                    <th>Path</th>
                    <th>Manage</th>
                </tr>
                <tr v-for="server in props.servers">
                    <td>{{ server.name }}</td>
                    <td>{{ server.mem }} MB</td>
                    <td>{{ server.path }}</td>
                    <td><button @click="serverManaging = server">Manage</button></td>
                </tr>
            </table>
        </div>
        <p v-if="props.servers.length === 0">There are no servers for you to manage.</p>
    </div>
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
.inner-server {
    display: flex;
    margin-top: 5px;
    justify-content: space-between;
}
</style>