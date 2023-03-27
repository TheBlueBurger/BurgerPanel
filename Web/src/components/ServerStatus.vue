<script setup lang="ts">
import { onMounted, onUnmounted, ref, Ref } from 'vue';
import event from '../util/event';
let props = defineProps({
    server: {
        
    }
})
let status: Ref<"running" | "stopped" | undefined> = ref();
onMounted(() => {
    event.on("serverStatusUpdate-" + (props.server as any)?._id || (() => {throw new Error("Server ID does not exist: " + props.server)})(), d =>{
        status.value = d?.status;
    });
    event.emit("sendPacket", {
        type: "getServer",
        id: (props.server as any)?._id,
        requestStatus: true
    })
});
onUnmounted(() => {
    event.removeAllListeners("serverStatusUpdate-" + (props.server as any)?._id);
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