<script setup lang="ts">
import { computed, Ref, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Server } from '@share/Server';
import sendRequest from '@util/request';
import titleManager from '@util/titleManager';
import { useUser } from '@stores/user';
import { useServers } from '@stores/servers';
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
let logData = ref("");
server.value = await servers.getServerByID(props.server);
if(!viewingLog.value) titleManager.setTitle("Logs in " + server.value.name);
let logs = ref([] as string[]);
await Promise.all([
    (async () => {
        let resp = await sendRequest("serverLogs", {
            id: props.server,
            list: true
        });
        if(resp.type == "list") {
            logs.value = resp.files;
        }
        return
    })(),
    (async () => {
        if(viewingLog.value) await getLog(viewingLog.value?.toString() || "")
    })()
])
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
    logData.value = resp.log;
}
</script>
<template>
    <div class="button-container">
    <RouterLink :to="{
        name: 'editServer',
        params: {
            server: props.server
        }
    }" v-if="!viewingLog"><button class="smallbuttons">Go back</button></RouterLink>
        <RouterLink :to="{
        name: 'serverFiles',
        params: {
            server: props.server
        }
    }" v-if="!viewingLog && server && user.hasServerPermission(server, 'serverfiles.read')"><button class="smallbuttons">View all files</button></RouterLink></div>
    <h1 v-if="!viewingLog">Logs for <span class="codeblock">{{ server?.name }}</span>:</h1>
    <div v-for="log in logs" class="logname" v-if="!viewingLog">
        <RouterLink :to="{
            name: 'viewLogs',
            params: {
                server: props.server
            },
            query: {
                log
            }
        }">{{ log }}
        </RouterLink>
    </div>
    <div v-else>
        <h1>{{ viewingLog }} in {{ server.name }}</h1><RouterLink :to="{
            name: 'viewLogs',
            params: {
                server: props.server
            }
        }"><button class="lastbutton">Go back</button></RouterLink>
        <textarea readonly>{{ logData }}</textarea>
    </div>
</template>
<style scoped>
    .button-container {
        margin-top: 10px;
        margin-left: 20px;
    }
    .lastbutton {
        margin-left: 40px;
        margin-bottom: 10px;
    }
    .smallbuttons {
        margin-right: 5px;
    }
    .logname {
        display:block;
        background-color: #3b3a3a60;
        border-radius: 10px;
        margin: 1px 20px;
        border: 1px solid #494949;
        transition: .1s ease-in-out;
    }
    .logname:last-child {
        margin-bottom: 20px;
    }
    .logname:hover {
        background-color: #4b4a4a80;
    }
    .logname a {
        display: block;
        padding: 10px;
    }
    .logname i {
        margin-right: 10px;
        color: #8d8d8d;
    }
    .logname:hover i {
        color: white;
    }
    textarea {
    resize: none;
    width: 95%;
    height: calc(100vh - 220px);
    overflow-y: scroll;
    border-radius: 7px;
    /* Center */
    margin-left: auto;
    margin-right: auto;
    display: block;
    /* Color */
    background-color: #0e0e0e;
    border: 1px solid #302e2c;
    color: #e8dc8d;
    padding: 10px;
    outline: none;
    }
    a {
        text-decoration: none;
        color: white;
    }
    h1 {
        padding: 15px;
        padding-left:20px;
        font-size: 30px;
    }
    button {
        background-color: #3b3a3a80;
        border: 1px solid #494949;
        color: white;
    }
    button:hover {
        background-color: #4b4a4aa0;
    }
    .logname .filesize {
        float: right;
        margin-right: 10px;
        color: #686868;
        /* margin-right: -25px; */
    }
</style>