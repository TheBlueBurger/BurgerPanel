<script setup lang="ts">
import { Server } from '../../../Share/Server.js';
import EventEmitter from '../util/event';

let props = defineProps<{
  server: Server;
  events: typeof EventEmitter;
}>();
let e = defineEmits(['deleteServer']);
function deleteServer() {
  if(confirm("Are you sure you want to delete this server and ALL files? This cannot be undone.")) {
    e('deleteServer', props.server);
  }
}
</script>

<template>
Managing {{ server.name }}<br/>
<pre>Debug: {{ JSON.stringify(server, null, 2) }}</pre>
<br/>
<button @click="deleteServer()">Delete</button>
</template>