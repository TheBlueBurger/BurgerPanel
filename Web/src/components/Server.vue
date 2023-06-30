<script setup lang="ts">
    import { Server as ServerType } from '@share/Server';
    import { useServers } from '../stores/servers';
    import ServerStatus from './ServerStatus.vue';
    import sendRequest from '@util/request';
    import { confirmModal } from '@util/modal';

    let props = defineProps<{
        server: ServerType
    }>();
    let servers = useServers();
    async function startServer(server: ServerType) {
        sendRequest("startServer", {id: server._id});
    }
    async function stopServer(server: ServerType) {{
        if(await confirmModal(`Stop server`, `Are you sure you want to stop ${server.name}?`, true, true, true)) sendRequest("stopServer", {id: server._id});
    }}
</script>

<template>
    <div class="server">
            <RouterLink :to="{
                name: 'manageServer',
                params: {
                    server: server._id
                }
            }">
                <div class="server-content">
                    <div class="servername">{{server.name}}</div>
                    <div class="status"><ServerStatus :server="server._id" /></div>
                    {{ server.software.charAt(0).toUpperCase() + server.software.slice(1) }} {{ server.version }}<br/>
                    Port {{server.port}} ({{ server.mem }}MB)<br/>
                    <button :disabled="(['running', 'stopping', 'unknown'].includes(servers.statuses[server._id].status))" class="green" @click.prevent="startServer(server)">Start</button>
                    <button :disabled="(['stopped', 'stopping', 'unknown'].includes(servers.statuses[server._id].status))" class="red" @click.prevent="stopServer(server)">Stop</button>
                    <RouterLink :to="{
                        name: 'editServer',
                        params: {
                            server: server._id
                        }
                    }"><button>Edit</button></RouterLink><br/>
                    <RouterLink :to="{
                        name: 'serverFiles',
                        params: {
                            server: server._id
                        }
                    }"><button>Files</button></RouterLink>
                                        <RouterLink :to="{
                        name: 'viewLogs',
                        params: {
                            server: server._id
                        }
                    }"><button>Logs</button></RouterLink>
                </div>
            </RouterLink>
            </div>
</template>

<style scoped>
    .server {
        background-color: #2e2e2e;
        min-width: 300px;
        margin-left: 10px;
        border-radius: 10px;
        justify-content: left;
        margin-bottom: 5px;
        text-align: center;
    }
    .server > * {
        text-decoration: none;
        color: white;
    }
    .green {
        background-color: #1b7436;
    }
    .red {
        background-color: #af0a0a;
    }
    .red[disabled] {
        background-color: #7e0707;
        color: #8f8f8f;
    }
    .green[disabled] {
        background-color: #185300;
        color: #8f8f8f;
    }
    .server > * {
        margin-left: 5px;
    }
    .servername {
        font-size:xx-large;
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
</style>