<script setup lang="ts">
import { onUnmounted, onMounted, Ref, ref } from 'vue';
import { ServerPerformancePacketS2C } from '../../../Share/Perf';
import { hasPermission} from '../../../Share/Permission';
import { useUser } from '../stores/user';
import sendRequest from '../util/request';
let user = useUser();
let intervalID = -1;
onUnmounted(() => {
    clearInterval(intervalID);
});
let perf: Ref<ServerPerformancePacketS2C | null> = ref() as Ref<ServerPerformancePacketS2C | null>;
async function getAndSetPerf() {
    if (typeof user.user?.username == "string") { // logged in
        if(!hasPermission(user.user, "performance.view")) return;
        perf.value = await sendRequest("serverPerformance");
    }
}
getAndSetPerf();
onMounted(() => {
    intervalID = setInterval(async () => {
        if(!user.hasPermission("performance.view")) {
            perf.value = null;
            return;
        }
        await getAndSetPerf();
    }, 2000);
});
</script>
<template>
    <div>
        <h1>System Performance</h1>
        <div v-if="perf != null">
            <p v-if="perf.load"><b>Load:</b> 1m: {{ perf?.load[0] }} 5m: {{ perf.load[1] }} 15m: {{ perf.load[2] }}</p>
            <p v-if="perf.platform == 'win32'">Load is unavailable since this server is hosted on Windows.</p>
            <p v-else-if="!user.hasPermission('performance.load')">You do not have permission to view load data.</p>
            <p v-if="perf.mem"><b>Server RAM:</b> {{ perf?.mem?.percentage }}%</p>
            <p v-else>You do not have permission to see RAM data.</p>
            <p v-if="perf.platform"><b>Platform:</b> {{ perf.platform }}</p>
            <p v-else>You do not have permission to view the platform.</p>
        </div>
        <div v-else-if="!user.hasPermission('performance.view')">
            You do not have permission to view performance data
        </div>
        <div v-else>
            Loading performance data...
        </div>
    </div>
</template>
