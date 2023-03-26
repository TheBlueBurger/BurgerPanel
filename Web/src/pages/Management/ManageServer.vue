<script setup lang="ts">
import { Ref, inject, onMounted, ref, onUnmounted } from 'vue';
import { Server } from '../../../../Share/Server';
import events from '../../util/event';
import { useRouter } from 'vue-router';
let router = useRouter();
let props = defineProps<{
  server: string;
}>();
let servers: Ref<Server[]> = inject('servers') as Ref<Server[]>;
let server = ref(null as Server | null);
let loadingServerFromAPI = ref(false);
let logs: Ref<String[]> = ref([]);
let attached = ref(false);
onMounted(async () => {
  loadingServerFromAPI.value = true;
  // Attach to server
  if (!attached.value) {
    events.emit("sendPacket", {
      type: "attachToServer",
      _id: props.server
    });
    let resp = await events.awaitEvent("server-attached-" + props.server);
    if (resp?.success) {
      server.value = resp.server;
      console.log("Attached to", resp.server.name);
      logs.value = resp.lastLogs;
      attached.value = true;
      // Scroll to bottom
      setTimeout(() => { // there has to be a better way to do this, but this is what ill do and it works
        serverTextArea.value?.scrollTo(0, serverTextArea.value?.scrollHeight);
      }, 50);
    } else {
      alert("Failed to attach to server: " + resp.message);
      router.push("/manage")
    }
    loadingServerFromAPI.value = false;
  }
  events.on("serverOutput-" + props.server, data => {
    n++;
    let thisID = n;
    ignoreNextScroll.value = true;
    logs.value.push(data.data);
    if(!autoScrollInterrupted.value) serverTextArea.value?.scrollTo(0, serverTextArea.value?.scrollHeight);
    setTimeout(() => {
      if (thisID == n) ignoreNextScroll.value = false;
    }, 250);
  })
});
let n = 0;
let autoScrollInterrupted = ref(false);
let ignoreNextScroll = ref(false);
function startServer() {
  events.emit("sendPacket", {
    type: "startServer",
    id: props.server
  });
  logs.value = [];
}
events.on("serverExited-" + props.server, data => {
  logs.value.push("Server exited with code " + data.code + "\n");
});
events.on("serverErrored-" + props.server, data => {
  logs.value.push("Server errored: " + data.error + "\n");
});
async function stopServer() {
  if(confirm("Are you sure you want to stop the server? Unsaved data will be saved.")) events.emit("sendPacket", {
    type: "stopServer",
    id: props.server
  });
  let resp = await events.awaitEvent("server-stopping-" + props.server);
  if(!resp.success) {
    events.emit("createNotification", "Cannot stop server: " + resp.message)
  }
}
function killServer() {
  if(confirm("Are you sure you want to KILL this server? All unsaved data will be GONE.")) events.emit("sendPacket", {
    type: "killServer",
    id: props.server
  });
}
onUnmounted(() => {
  events.emit("sendPacket", {
    type: "detachFromServer",
    id: props.server
  });
});
let consoleInput = ref("");
function sendCommand() {
  events.emit("sendPacket", {
    type: "writeToConsole",
    id: props.server,
    command: consoleInput.value
  });
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
function editServer() {
  router.push({
    name: "editServer",
    params: {
      server: props.server
    }
  })
}
</script>

<template>
  <div v-if="server">
    Managing '{{ server.name }}'<br />
    <br />
    <button @click="startServer()">Start</button>
    <button @click="stopServer()">Stop</button>
    <button @click="killServer()">Kill</button>
    <RouterLink :to="{name: 'editServer', params: {server: server._id}}"><button>Edit</button></RouterLink>
    <br />
    Logs:
    <textarea readonly ref="serverTextArea" @scroll="onScrolled">{{ logs.join("") }}</textarea>
    <div class="console-input"><input type="text" class="console-input-input" v-model="consoleInput" placeholder="Write here..." @keyup.enter="sendCommand" /><button class="console-input-button" @click="sendCommand"><span class="console-input-button-span">Send</span></button></div>
    <br/>
  </div>
  <div v-else>
    {{ loadingServerFromAPI ? "Unknown server. Requesting server details." : "Server not found" }}
  </div>
</template>
<style scoped>
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
.console-input {
  height: 30px;
  width: 95.2%;
  border: none;
  /* Center */
  margin-left: auto;
  margin-right: auto;
  display: flex;
  /* Color */
  color: white;
  background-color: black;
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
  background-color: rgb(3, 3, 3);
  color: white;
}
.console-input-button {
  padding: 19px;
  padding-left: 25px;
  text-align: center;
  display: block;
  border: none;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
  border-top-right-radius: 0px;
  background-color: rgb(15, 15, 15);
  color: white;
}
.console-input-button-span {
  /* Center the text in the button */
  display: inline-block;
  vertical-align: middle;
  margin-top: -1em;
}
</style>