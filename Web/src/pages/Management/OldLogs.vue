<script setup lang="ts">
import { computed, inject, onMounted, Ref, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Server } from '../../../../Share/Server';
import sendRequest from '../../util/request';
import titleManager from '../../util/titleManager';
import { hasServerPermission } from '../../../../Share/Permission';
import { User } from '../../../../Share/User';
import { useUser } from '../../stores/user';
import { useServers } from '../../stores/servers';
let server = ref() as Ref<Server>;
let props = defineProps({
    server: {
        required: true,
        type: String
    }
});
let router = useRouter();
let user = useUser();
let viewingLog = computed(() => {
    return router.currentRoute.value.query.log
});
let servers = useServers();
server.value = await servers.getServerByID(props.server);
if(viewingLog.value) getLog(viewingLog.value?.toString() || "");
else titleManager.setTitle("Logs in " + server.value.name)
let resp = await sendRequest("serverLogs", {
    id: props.server,
    list: true
});
let logs = ref([] as string[]);
if(resp.type == "list") {
    logs.value = resp.files;
}
let logData = ref("");
watch(() => viewingLog.value, async (val) => {
    let str = val?.toString();
    if(str) {
        getLog(str)
    } else titleManager.setTitle("Logs in " + server.value.name)
});
async function getLog(logName: string) {
    titleManager.setTitle(`${logName} in ${server.value.name}`);
    console.log("Getting", logName)
    if(!logName) return;
    logData.value = "";
    if(!viewingLog) return;
    let resp = await sendRequest("serverLogs", {
        id: props.server,
        log: logName
    });
    if(resp.type != "log") return;
    logData.value = resp.log; //e
}
</script>
<template>
    <RouterLink :to="{
        name: 'editServer',
        params: {
            server: props.server
        }
    }" v-if="!viewingLog"><button>Go back</button></RouterLink>
        <RouterLink :to="{
        name: 'serverFiles',
        params: {
            server: props.server
        }
    }" v-if="!viewingLog && server && user.hasServerPermission(server, 'serverfiles.read')"><button>View all files</button></RouterLink>
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
        <h1>{{ viewingLog }} in {{ server.name }}</h1><RouterLink :to="{
            name: 'viewLogs',
            params: {
                server: props.server
            }
        }"><button>Go back</button></RouterLink>
        <textarea readonly>{{ logData }}</textarea>
    </div>
</template>
<style scoped>
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
    a {
        text-decoration: none;
        color: white;
    }
</style>