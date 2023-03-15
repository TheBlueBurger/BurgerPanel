<script setup lang="ts">
import { onUnmounted, onMounted, Ref, ref, inject } from 'vue';
import { ServerPerformancePacketS2C } from '../../../Share/Perf';
import { User } from '../../../Share/User';
import EventEmitter from '../util/event';
let events = inject("events") as Ref<typeof EventEmitter>;
let loginStatus = inject("loginStatus") as Ref<User | null>;
let intervalID = -1;
onUnmounted(() => {
    clearInterval(intervalID);
});
let perf: Ref<ServerPerformancePacketS2C | null> = ref() as Ref<ServerPerformancePacketS2C | null>;
async function getAndSetPerf() {
    if (typeof loginStatus?.value?.username == "string") { // logged in
        events.value.emit("sendPacket", {
            type: "serverPerformance"
        });
        perf.value = await events.value.awaitEvent("serverPerformance");
    }
}
getAndSetPerf();
onMounted(() => {
    intervalID = setInterval(async () => {
        await getAndSetPerf();
    }, 2000);
})
</script>
<template>
    <div>
        <h1>System Performance</h1>
        <div v-if="perf != null">
            <p v-if="perf.platform != 'win32'"><b>Load:</b> 1m: {{ perf?.cpu[0] }} 5m: {{ perf.cpu[1] }} 15m: {{ perf.cpu[2] }}</p>
            <p v-else>Load is unavailable since this server is hosted on Windows.</p>
            <p>Server RAM: {{ perf?.mem?.percentage }}%</p>
        </div>
        <div v-else>
            Loading performance data...
        </div>
    </div>
</template>