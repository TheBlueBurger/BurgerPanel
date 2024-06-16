<script setup lang="ts">
import { useServers } from '@stores/servers';
import { useWS } from '@stores/ws';
import { ref } from 'vue';
const ws = useWS();
const props = defineProps<{
    server: string
}>()
const servers = useServers();
const server = ref(await servers.getServerByID(props.server));
const isInstalledResp = await ws.sendRequest("integrator", {
    id: props.server,
    action: "isInstalled"
});
if(isInstalledResp.type != "isInstalled") throw new Error("bad type");
const status = ref();
async function getStatus() {
    const statusResp = await ws.sendRequest("integrator", {
        id: props.server,
        action: "status"
    });
    if(statusResp.type != "status") return;
    status.value = statusResp.status;
}
</script>

<template>
    {{server.name}} Integrator<br/>
    Installed: {{ isInstalledResp.installed }} <button v-if="!isInstalledResp.installed" @click="ws.sendRequest('integrator', {
        id: props.server,
        action: 'install'
    })">Install</button>
    <button @click="getStatus">get status</button>
    <pre>{{ JSON.stringify(status, null, 2) }}</pre>
</template>