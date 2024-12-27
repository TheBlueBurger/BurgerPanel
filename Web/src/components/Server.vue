<script setup lang="ts">
    import { Server as ServerType } from '@share/Server';
    import { useServers } from '../stores/servers';
    import ServerStatus from './ServerStatus.vue';
    import sendRequest from '@util/request';
    import { confirmModal } from '@util/modal';
    import { hasServerPermission } from '@share/Permission';
import { useUser } from '../stores/user';

    let props = defineProps<{
        server: ServerType
    }>();
    let user = useUser();
    let servers = useServers();
    async function startServer(server: ServerType) {
        sendRequest("startServer", {id: server.id});
    }
    async function stopServer(server: ServerType) {{
        if(await confirmModal(`Stop server`, `Are you sure you want to stop ${server.name}?`, true, true, true)) sendRequest("stopServer", {id: server.id});
    }}
</script>

<template>
    <div class="server">
            <RouterLink :to="{
                name: 'manageServer',
                params: {
                    server: server.id
                }
            }">
                <div class="server-content">
                    <div class="servername">{{server.name}}</div>
                    <div class="status"><ServerStatus :server="server.id" /></div>
                    {{ server.software.charAt(0).toUpperCase() + server.software.slice(1) }} {{ server.version }}<br/>
                    Port {{server.port}} ({{ server.memory }}MB)<br/>
                    <button :disabled="(['running', 'stopping', 'unknown'].includes(servers.statuses[server.id].status))" class="green" @click.prevent="startServer(server)">Start</button>
                    <button :disabled="(['stopped', 'stopping', 'unknown'].includes(servers.statuses[server.id].status))" class="red" @click.prevent="stopServer(server)">Stop</button>
                    <RouterLink :to="{
                        name: 'editServer',
                        params: {
                            server: server.id
                        }
                    }"><button>Edit</button></RouterLink><br/>
                    <RouterLink :to="{
                        name: 'serverFiles',
                        params: {
                            server: server.id
                        }
                    }" v-if="user.hasServerPermission(server, 'serverfiles.read')"><button>Files</button></RouterLink>
                                        <RouterLink :to="{
                        name: 'viewLogs',
                        params: {
                            server: server.id
                        }
                    }" v-if="user.hasServerPermission(server, 'serverfiles.read')"><button>Logs</button></RouterLink>
                </div>
            </RouterLink>
            </div>
</template>

<style scoped>
    .status {
        margin-bottom: 5px;
    }
    br {
        margin-bottom: 5px;
    }
    .server {
        /* background-color: #2e2e2e; */
        min-width: 300px;
        /* margin-left: 10px; */
        margin: 5px;
        /* border-radius: 10px; */
        justify-content: left;
        margin-bottom: 5px;
        text-align: center;
        border: 1px #333030 solid;
        background-color: #201f1f;
        border-radius:10px;
    }
    .server > * {
        text-decoration: none;
        color: white;
    }
    .green {
        background-color: #1b7436;
        border-color: #2da852;
    }
    .red {
        background-color: #af0a0a;
        border-color: #e03737;
    }
    .red[disabled] {
        background-color: #7e0707;
        border-color: #a52525;
        color: #8f8f8f;
    }
    .green[disabled] {
        background-color: #185300;
        border-color: #196b32;
        color: #8f8f8f;
    }
    .server > * {
        margin-left: 5px;
    }
    .servername {
        font-size:xx-large;
        margin-bottom: 5px;
    }
    #servers-container {
        display: flex;
        flex-wrap:wrap;
        justify-content: center;
    }
    .server-content {
        padding-bottom: 50px;
        padding-right: 10px;
    }
    button {
        margin: 2px;
    }
</style>