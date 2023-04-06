<script setup lang="ts">
    import { onMounted, ref } from 'vue';
    import { getSetting } from '../util/config';
    import { IDs } from "../../../Share/Logging";
import TextInput from '../components/TextInput.vue';
import event from '../util/event';
    
    let webhookURL = ref("");
    let finishedLoading = ref(false);
    let disabledLogs = ref([] as typeof IDs[number][]);
    async function load(reload: boolean = false) {
        webhookURL.value = await getSetting("logging_DiscordWebHookURL", reload);
        disabledLogs.value = await getSetting("logging_DisabledIDs", reload);
    }
    onMounted(async () => {
        await load();
        finishedLoading.value = true;
    });
    function isDisabled(id: typeof IDs[number]) {
        return disabledLogs.value.includes(id);
    }
    async function setWebhookURL(url: string) {
        event.emit("sendPacket", {
            type: "logging",
            setWebhookURL: true,
            url
        });
        let resp = await event.awaitEvent("logging");
        if(!resp) return alert(resp.message);
        await load(true);
    }
    async function toggle(id: typeof IDs[number]) {
        event.emit("sendPacket", {
            type: "logging",
            setLoggingTypeEnabled: true,
            id,
            enabled: isDisabled(id)
        });
        let resp = await event.awaitEvent("logging");
        if(!resp) return alert(resp.message);
        await load(true);
    }
</script>

<template>
    <div v-if="finishedLoading">
        <h1>Logging</h1>
        Webhook url: <TextInput @set="setWebhookURL" :default="webhookURL" placeholder="The URL" /> <button @click="setWebhookURL('')">Disable</button>
        <div v-for="id in IDs">
            {{ id }} - <span :class="{
                red: isDisabled(id),
                green: !isDisabled(id)
            }">{{ isDisabled(id) ? "Disabled" : "Enabled" }}</span> <button @click="toggle(id)">Toggle</button>
        </div>
    </div>
    <div v-else>
        Loading
    </div>
</template>
<style scoped>
.red {
    color: red;
}
.green {
    color: green;
}
</style>