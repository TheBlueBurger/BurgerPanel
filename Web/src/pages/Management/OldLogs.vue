<script setup lang="ts">
import { computed, inject, onMounted, Ref, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Server } from '../../../../Share/Server';
import event from '../../util/event';
import getServerByID from '../../util/getServerByID';
let server = ref() as Ref<Server>;
let cachedServers = inject("servers") as Ref<Server[]>;
let props = defineProps({
    server: {
        required: true,
        type: String
    }
})
onMounted(async () => {
    server.value = await getServerByID(cachedServers.value, props.server);
    event.emit("sendPacket", {
        type: "serverLogs",
        id: props.server,
        list: true
    });
    let resp = await event.awaitEvent("serverLogs-list");
    if (!resp.success) alert(resp.message);
    else logs.value = resp.files;
});
let logs = ref([] as string[]);
let logData = ref("");
let router = useRouter();
let viewingLog = computed(() => {
    return router.currentRoute.value.query.log
});
watch(() => viewingLog.value, async (val) => {
    let str = val?.toString();
    str && getLogs(str);
});
async function getLogs(logName: string) {
    console.log("Getting", logName)
    if(!logName) return;
    logData.value = "";
    if(!viewingLog) return;
    event.emit("sendPacket", {
        type: "serverLogs",
        id: props.server,
        log: logName
    });
    let resp = await event.awaitEvent("serverLogs-" + logName);
    if(!resp.success) alert(resp.message);
    logData.value = resp.log;
    console.log(logData.value)
}
if(viewingLog) getLogs(viewingLog.value?.toString() || "");
</script>
<template>
    <RouterLink :to="{
        name: 'editServer',
        params: {
            server: props.server
        }
    }" v-if="!viewingLog"><button>Go back</button></RouterLink>
    <h1 v-if="!viewingLog">Logs for {{ server?.name }}</h1>
    <div v-for="log in logs" class="logname" v-if="!viewingLog">
        <RouterLink :to="{
            name: 'viewLogs',
            params: {
                server: props.server
            },
            query: {
                log
            }
        }">
            {{ log }}
        </RouterLink>
    </div>
    <div v-else>
        <h1>{{ viewingLog }}</h1><RouterLink :to="{
            name: 'viewLogs',
            params: {
                server: props.server
            }
        }"><button>Go back</button></RouterLink>
        <textarea readonly>{{ logData }}</textarea>
    </div>
</template>
<style>
    .logname {
        margin-bottom: 10px;
    }
    textarea {
  resize: none;
  width: 95%;
  height: calc(100vh - 190px);
  overflow-y: scroll;
  border-radius: 7px;
  border-bottom-left-radius: 0px;
  border-bottom-right-radius: 0px;
  border: none;
  /* Center */
  margin-left: auto;
  margin-right: auto;
  display: block;
  /* Color */
  background-color: #000000;
  color: white;
}
</style>