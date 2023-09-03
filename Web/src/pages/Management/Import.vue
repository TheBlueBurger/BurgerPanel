<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import event from '@util/event';
import sendRequest from '@util/request';
import { allowedSoftwares } from '@share/Server';
import { modalInput } from '@util/modal';
import { useSettings } from '@stores/settings';
import { useUser } from '@stores/user';
import { useServers } from '@stores/servers';

let settings = useSettings();
let router = useRouter();
let serverPath = ref();
let user = useUser();
let updateServerPath = async () => {
    let _serverPath = router.currentRoute.value.query.serverPath;
    serverPath.value = _serverPath;
    if (!_serverPath) {
        return;
    }
    let resp = await sendRequest("importServer", {
        path: _serverPath,
        requestConfirmation: true
    }).catch(err => {
        router.push({
            query: {
                serverPath: undefined
            }
        });
    }); // is there a better way to do this?
    if(resp?.type !== "autodetect") return;
    if (resp.autodetect.version) version.value = resp.autodetect.version;
    if (resp.autodetect.software) software.value = resp.autodetect.software ?? (user.hasPermission("settings.read") ? await settings.getSetting("defaultMCSoftware") : undefined);
    if (resp.autodetect.port) port.value = resp.autodetect.port;
    let splitString = _serverPath.toString().split("/");
    let folderName = splitString[splitString.length-1];
    name.value = folderName;
}
watch(router.currentRoute, updateServerPath);
updateServerPath();
async function changeServerPath() {
    let newServerPath = (await modalInput("Enter server path", [{
        id: "path",
        type: "TextInput",
        data: {
            placeholder: "Path",
            inputType: "text"
        },
    }], undefined, "OK_CANCEL"))?.inputs?.path;
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
let servers = useServers();
async function importServer() {
    let resp = await sendRequest("importServer", {
        path: serverPath.value,
        name: name.value,
        mem: mem.value,
        version: version.value,
        software: software.value,
        port: port.value
    });
    if(resp?.type != "success") return;
    event.emit("createNotification", "Server imported successfully");
    servers.updateServer(resp.server);
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
    Name: <input v-model="name" type="text" /> <br />
    Memory (MB): <input type="number" v-model="mem" /> MB <br />
    Version: <input v-model="version" type="text" /> <br />
    Server software: <select v-model="software"><option v-for="software in allowedSoftwares">{{ software }}</option></select><br/>
    Port: <input type="number" v-model="port" /> <br />
    <button @click="importServer">Import</button>
</template>
<style scoped>
button {
    margin-bottom: 3px;
}
input {
    margin-bottom: 3px;
}
select {
    margin-bottom: 4px;
}
</style>