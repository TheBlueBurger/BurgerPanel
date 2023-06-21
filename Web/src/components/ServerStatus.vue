<script setup lang="ts">
import { computed, Ref } from 'vue';
import { useServers } from '../stores/servers';
import { ServerStatus } from '@share/Server';
let props = defineProps({
    server: {
        type: String,
        required: true
    }
});
let servers = useServers();
let status: Ref<ServerStatus> = computed(() => {
    return servers.statuses[props.server]?.status || "unknown";
});
let statusText = computed(() => {
    return status.value.charAt(0).toUpperCase() + status.value.slice(1);
})
</script>

<template>
    <span class="container"><span :class="{
        dot: true,
        red: status == 'stopped' || status == 'stopping',
        green: status == 'running',
        gray: status == 'unknown'
    }" /><pre> </pre><span class="text">{{ statusText }}</span></span>
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