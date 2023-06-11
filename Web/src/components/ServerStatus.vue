<script setup lang="ts">
import { computed, inject, Ref, watch } from 'vue';
import { useServers } from '../stores/servers';
let props = defineProps({
    server: {
        type: String,
        required: true
    }
});
let servers = useServers();
let status: Ref<"running" | "stopped" | "unknown"> = computed(() => {
    return servers.statuses[props.server]?.status || "unknown";
});
</script>

<template>
    <span class="container"><span :class="'dot ' + (status == 'running' ? 'green' : status == 'stopped' ? 'red': 'gray')" /><pre> </pre><span class="text">{{   status == "running" ? "Running" : status == "stopped" ? "Stopped" : "Unknown" }}</span></span>
</template>

<style scoped>
.dot {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  display: inline-block;
}
.green {
    background-color: #0bbb31;
}
.red {
    background-color: #c53d3d;
}
.gray {
    background-color: #504a4a;
}
.text {
  text-align: center;
  vertical-align: middle;
}
.container {
  display: inline-flex;
  align-items: center;
}
</style>