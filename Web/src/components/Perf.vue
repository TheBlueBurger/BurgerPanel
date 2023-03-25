<script setup lang="ts">
import { onUnmounted, onMounted, Ref, ref, inject } from 'vue';
import { ServerPerformancePacketS2C } from '../../../Share/Perf';
import {validPermissions, hasPermission} from '../../../Share/Permission';
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
            <p v-if="perf.load"><b>Load:</b> 1m: {{ perf?.load[0] }} 5m: {{ perf.load[1] }} 15m: {{ perf.load[2] }}</p>
            <p v-if="perf.platform == 'win32'">Load is unavailable since this server is hosted on Windows.</p>
            <p v-else-if="!hasPermission(loginStatus, 'performance.load')">You do not have permission to view load data.</p>
            <p v-if="perf.mem">Server RAM: {{ perf?.mem?.percentage }}%</p>
            <p v-else>You do not have permission to see RAM data.</p>
            <p v-if="perf.platform">Platform: {{ perf.platform }}</p>
            <p v-else>You do not have permission to view the platform.</p>
        </div>
        <div v-else-if="!hasPermission(loginStatus, 'performance.view')">
            You do not have permission to view performance data
        </div>
        <div v-else>
            Loading performance data...
        </div>
    </div>
</template>
