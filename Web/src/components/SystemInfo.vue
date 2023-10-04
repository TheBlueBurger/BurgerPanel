<script setup lang="ts">
import { onUnmounted, onMounted, Ref, ref, computed } from 'vue';
import type { RequestResponses } from '@share/Requests';
type PacketType = RequestResponses["systemInformation"]
import { hasPermission} from '@share/Permission';
import { useUser } from '../stores/user';
import sendRequest from '../util/request';
let user = useUser();
let intervalID = -1;
onUnmounted(() => {
    clearInterval(intervalID);
});
let info: Ref<PacketType | null> = ref() as Ref<PacketType | null>;
async function getAndSetInfo() {
    if (typeof user.user?.username == "string") { // logged in
        if(!hasPermission(user.user, "performance.view")) return;
        info.value = await sendRequest("systemInformation");
    }
}
let perf = computed(() => info.value?.performance);
getAndSetInfo();
onMounted(() => {
    intervalID = setInterval(async () => {
        if(!user.hasPermission("performance.view")) {
            info.value = null;
            return;
        }
        await getAndSetInfo();
    }, 2000);
});
</script>
<template>
    <div class="box">
        <h1>Performance</h1>
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
    <div class="box" style="margin-top:5px">
        <h1>General Information</h1>
        <p v-if="typeof info?.general.serverAmount == 'number'">This instance is hosting {{ info.general.serverAmount }} server{{ info.general.serverAmount == 1 ? '' : 's' }}</p>
        <template v-if="typeof info?.general.clients == 'object'">
            Currently connected:
            <ul>
                <li v-for="client of info.general.clients" style="margin-left:15px"><template v-if="typeof client?.username == 'string'">{{ client.username }}</template><template v-else><i>[Not logged in]</i></template></li>
            </ul>
        </template>
    </div>
</template>

<style scoped>
    .box {
        border: 1px #333030 solid;
        background-color: #201f1f;
        border-radius:10px;
        padding: 10px 15px;
        width: fit-content;
        margin: 0 auto;
    }
    h1 {
        margin-bottom: 10px;
    }
    p {
        margin-bottom: 5px;
    }
</style>