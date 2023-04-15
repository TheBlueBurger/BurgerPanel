<script setup lang="ts">
import { computed, inject, Ref, watch } from 'vue';
import { ServerStatuses } from '../../../Share/Server';
let props = defineProps({
    server: {
        type: String,
        required: true
    }
});
let statuses = inject("statuses") as Ref<ServerStatuses>;
let status: Ref<"running" | "stopped" | "unknown"> = computed(() => {
    return statuses.value[props.server]?.status || "unknown";
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