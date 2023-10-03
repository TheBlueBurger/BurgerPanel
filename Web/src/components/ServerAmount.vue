<script setup lang="ts">
import { onUnmounted, onMounted, Ref, ref } from 'vue';
import { ServerAmountPacketS2C } from '@share/ServerAmount';
import { hasPermission } from '@share/Permission';
import { useUser } from '../stores/user';
import sendRequest from '../util/request';
let user = useUser();
let intervalID = -1;
onUnmounted(() => {
    clearInterval(intervalID);
});
let serveramount: Ref<ServerAmountPacketS2C | null> = ref() as Ref<ServerAmountPacketS2C | null>;
async function getAndSetSA() {
    if (typeof user.user?.username == "string") { // logged in
        if(!hasPermission(user.user, "servers.amount")) return;
        serveramount.value = await sendRequest("serverAmount");
    }
}
getAndSetSA();
onMounted(() => {
    intervalID = setInterval(async () => {
        if(!user.hasPermission("servers.amount")) {
            serveramount.value = null;
            return;
        }
        await getAndSetSA();
    }, 2000);
});
</script>
<template>
    <div class="perf">
        <h1>General Information</h1>
        <div v-if="serveramount != null">
            <p v-if="serveramount.amount">This BurgerPanel instance is currently hosting <b>{{ serveramount.amount }}</b> servers.</p>
            <p v-else-if="!user.hasPermission('servers.amount')">You do not have permission to view server amount data.</p>
        </div>
        <div v-else>
            Loading server amount data...
        </div>
    </div>
</template>

<style scoped>
    .perf {
        border: 1px #333030 solid;
        background-color: #201f1f;
        border-radius:10px;
        padding: 10px 15px;
        width: fit-content;
        margin: auto;
    }
    h1 {
        margin-bottom: 10px;
    }
    p {
        margin-bottom: 5px;
    }
</style>