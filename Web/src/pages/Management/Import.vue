<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getSetting } from '../../util/config';
import event from '../../util/event';

let router = useRouter();
let serverPath = ref();
let updateServerPath = async () => {
    let _serverPath = router.currentRoute.value.query.serverPath;
    if (!_serverPath) {
        return;
    }
    serverPath.value = _serverPath;
    event.emit("sendPacket", {
        type: "importServer",
        path: _serverPath,
        requestConfirmation: true
    });
    let resp = await event.awaitEvent("importServer");
    if (!resp.success) {
        event.emit("createNotification", "Failed to import server: " + resp.message);
        router.push({
            query: {
                serverPath: undefined
            }
        });
        serverPath.value = "";
        return;
    }
    if (resp.autodetect.version) version.value = resp.autodetect.version;
    if (resp.autodetect.software) software.value = resp.autodetect.software;
    if (resp.autodetect.port) port.value = resp.autodetect.port;
    let splitString = _serverPath.toString().split("/");
    let folderName = splitString[splitString.length-1];
    name.value = folderName;
}
watch(router.currentRoute, updateServerPath);
updateServerPath();
async function changeServerPath() {
    let newServerPath = prompt("Enter server path", serverPath.value);
    if (!newServerPath) return;
    router.push({
        query: {
            serverPath: newServerPath
        }
    });
}
let name = ref("");
let mem = ref(1024);
let version = ref("");
let software = ref();
let port = ref(25565);
onMounted(async () => {
    if (software.value == "") software = ref(await getSetting("defaultMCSoftware"));
});
async function importServer() {
    event.emit("sendPacket", {
        type: "importServer",
        path: serverPath.value,
        name: name.value,
        mem: mem.value,
        version: version.value,
        software: software.value,
        port: port.value
    });
    let resp = await event.awaitEvent("importServer");
    if (!resp.success) {
        event.emit("createNotification", "Failed to import server: " + resp.message);
        return;
    }
    event.emit("createNotification", "Server imported successfully");
    router.push({
        name: "manageServer",
        params: {
            server: resp.server._id
        }
    });
}
</script>
<template>
    Path: {{ serverPath || "Unset" }} <button @click="changeServerPath">Change</button> <br />
    Name: <input v-model="name" /> <br />
    Memory (MB): <input type="number" v-model="mem" /> MB <br />
    Version: <input v-model="version" /> <br />
    Server software: <input v-model="software" /> <br />
    Port: <input type="number" v-model="port" /> <br />
    <button @click="importServer">Import</button>
</template>
