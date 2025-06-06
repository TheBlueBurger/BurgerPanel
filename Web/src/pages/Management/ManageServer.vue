<script setup lang="ts">
import { Ref, ref, onUnmounted, computed } from 'vue';
import { Server } from '@share/Server';
import events from '@util/event';
import { useRouter } from 'vue-router';
import ServerStatus from '@components/ServerStatus.vue';
import sendRequest from '@util/request';
import titleManager from '@util/titleManager';
import { confirmModal } from '@util/modal';
import { useUser } from '@stores/user';
import { useServers } from '@stores/servers';
import { useWS } from '@stores/ws';
let router = useRouter();
let props = defineProps<{
  server: string;
}>();
let servers = useServers();
let thisServerStatus = computed(() => {
    return servers.statuses[props.server]?.status;
});
let isRunning = computed(() => thisServerStatus.value == "running" || thisServerStatus.value == "stopping");
let server = ref(null as Server | null);
let loadingServerFromAPI = ref(false);
let logs: Ref<String[]> = ref([]);
let attached = ref(false);
let user = useUser();
let ws = useWS();
loadingServerFromAPI.value = true;
let unmountAborter = new AbortController();
// Attach to server
if (!attached.value) {
  let resp = await sendRequest("attachToServer", {id: props.server}).catch(err => {
    router.push("/manage")
    return err;
  })
    server.value = resp.server;
    titleManager.setTitle(`${resp.server.name} console`)
    console.log("Attached to", resp.server.name);
    if(resp.lastLogs) logs.value = resp.lastLogs;
    attached.value = true;
    // Scroll to bottom
    setTimeout(() => { // there has to be a better way to do this, but this is what ill do and it works
      serverTextArea.value?.scrollTo(0, serverTextArea.value?.scrollHeight);
    }, 50);
    servers.statuses[props.server] = {status: resp.status}
  loadingServerFromAPI.value = false;
}
ws.listenForEvent("serverOutput-" + props.server, data => {
  n++;
  let thisID = n;
  ignoreNextScroll.value = true;
  logs.value.push(data.data);
  if(!autoScrollInterrupted.value) serverTextArea.value?.scrollTo(0, serverTextArea.value?.scrollHeight);
  while(logs.value.length > 100) logs.value.shift();
  setTimeout(() => {
    if (thisID == n) ignoreNextScroll.value = false;
  }, 250);
}, unmountAborter.signal);
let n = 0;
let autoScrollInterrupted = ref(false);
let ignoreNextScroll = ref(false);
function startServer() {
  sendRequest("startServer", {id: props.server})
  logs.value = [];
}
ws.listenForEvent("serverExited-" + props.server, data => {
  logs.value.push("Server exited with code " + data.code + "\n");
}, unmountAborter.signal);
ws.listenForEvent("serverErrored-" + props.server, data => {
  logs.value.push("Server errored: " + data.error + "\n");
}, unmountAborter.signal);
async function stopServer() {
  if(await confirmModal("Stop server", "Are you sure you want to stop the server? Unsaved data will be saved.", true, true, true)) await sendRequest("stopServer", {id: props.server})
}
async function killServer() {
  if(await confirmModal("Kill server", "Are you sure you want to KILL this server? All unsaved data will be GONE.", true, true, true)) await sendRequest("killServer", {id: props.server})
}
onUnmounted(() => {
  sendRequest("detachFromServer", {id: props.server});
  unmountAborter.abort();
});
let consoleInput = ref("");
function sendCommand() {
  sendRequest("writeToConsole", {
    id: props.server,
    command: consoleInput.value
  })
  consoleInput.value = "";
}
let lastScroll = ref(0);
let serverTextArea = ref(null as any as HTMLTextAreaElement);
function onScrolled() {
  if(lastScroll.value > (serverTextArea.value?.scrollTop || 0)) {
    autoScrollInterrupted.value = true;
  }
  lastScroll.value = serverTextArea.value?.scrollTop;
  if(!autoScrollInterrupted.value) serverTextArea.value?.scrollTo(0, serverTextArea.value?.scrollHeight);
  if(ignoreNextScroll.value) return;
  if(serverTextArea.value?.scrollTop + serverTextArea.value?.clientHeight >= serverTextArea.value?.scrollHeight - 10) {
    autoScrollInterrupted.value = false;
  } else {
    autoScrollInterrupted.value = true;
  }
}

</script>

<template>
  <div v-if="server">
    <h2>{{ server.name }}'s console</h2>
    <button style="margin-left:40px" @click="startServer()" :disabled="!user.hasServerPermission(server, 'start') || isRunning" id="startbtn">Start</button>
    <button @click="stopServer()" :disabled="!user.hasServerPermission(server, 'stop') || !isRunning || thisServerStatus == 'stopping'">Stop</button>
    <button @click="killServer()" :disabled="!user.hasServerPermission(server, 'kill') || !isRunning">Kill</button>
    <RouterLink :to="{name: 'editServer', params: {server: server.id}}"><button>Edit</button></RouterLink>
    <span class="server-status"><ServerStatus :server="server.id" /></span>
    <br />
    <textarea readonly ref="serverTextArea" @scroll="onScrolled">{{ logs.join("") }}</textarea>
    <div class="console-input" v-if="user.hasServerPermission(server, 'console.write')"><input type="text" class="console-input-input" v-model="consoleInput" placeholder="Write here..." @keyup.enter="sendCommand" /><button class="console-input-button" @click="sendCommand"><span class="console-input-button-span">Send</span></button></div>
    <br/>
  </div>
  <div v-else>
    {{ loadingServerFromAPI ? "Unknown server. Requesting server details." : "Server not found" }}
  </div>
</template>
<style scoped>
h2 {
  margin: 5px 10px;
  margin-left: 40px;
  padding-top: 10px;
}
h4 {
  margin: 5px 10px;
  margin-left: 40px;
}

textarea {
  resize: none;
  width: 95%;
  height: calc(100vh - 235px);
  overflow-y: scroll;
  border-radius: 7px;
  border-bottom-left-radius: 0px;
  border-bottom-right-radius: 0px;
  border: none;
  /* Center */
  margin-left: auto;
  margin-right: auto;
  margin-top: 5px;
  display: block;
  /* Color */
  background-color: #0e0e0e;
  border: 1px solid #302e2c;
  border-bottom: none;
  color: #e8dc8d;
  padding: 10px;
  outline: none;
}
.console-input {
  height: 30px;
  width: calc(95% + 30px + 1px);
  margin-left: 8px;
  border: none;
  /* Center */
  margin-left: auto;
  margin-right: auto;
  display: flex;
  /* Color */
  color: white;
  /* background-color: black; */
}
.console-input-input {
  height: 30px;
  width: 95%;
  border: none;
  border-top-right-radius: 0px;
  border-top-left-radius: 0px;
  border-bottom-right-radius: 0px;
  /* Center */
  display: block;
  /* Color */
  background-color: #0e0e0e;
  color: white;
  padding: 5px 10px;
  margin-left: 4px;
  border: 1px solid #302e2c;
  border-right: none;
}
.console-input-input:focus {
  background-color: #1e1e1e;
  outline: none;
}
.console-input-button {
  padding: 20px 25px;
  padding-left: 25px;
  text-align: center;
  display: block;
  border: 1px solid #302e2c;
  border-left: none;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
  border-top-right-radius: 0px;
  background-color: #0e0e0e;
  color: white;
}
.console-input-button:hover {
  background-color: #1e1e1e;
}
.console-input-button-span {
  /* Center the text in the button */
  display: inline-block;
  vertical-align: middle;
  margin-top: -1em;
}
.server-status {
  display: inline-flex;
  margin-top: 5px;
  margin-bottom: 20px;
  position: relative;
  top: 5px;
  margin-left: 10px;
}

button {
  margin-right: 5px;
}
h2 {
  margin-top: 5px;
  margin-bottom: 5px;
  font-size: xx-large;
}
</style>