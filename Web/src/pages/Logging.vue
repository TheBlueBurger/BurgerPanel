<script setup lang="ts">
    import { onMounted, ref } from 'vue';
    import { getSetting } from '../util/config';
    import { IDs } from "../../../Share/Logging";
    import TextInput from '../components/TextInput.vue';
    import event from '../util/event';
    let logPath = ref("");
    let webhookURL = ref("");
    let finishedLoading = ref(false);
    let disabledLogs = ref([] as typeof IDs[number][]);
    async function load(reload: boolean = false) {
        webhookURL.value = await getSetting("logging_DiscordWebHookURL", reload);
        disabledLogs.value = await getSetting("logging_DisabledIDs", reload);
        logPath.value = await getSetting("logging_logFile", reload);
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
        initialEditing = false;
        let resp = await event.awaitEvent("logging");
        if(!resp) return alert(resp.message);
        await load(true);
    }
    async function setLogPath(path: string) {
        event.emit("sendPacket", {
            type: "logging",
            setLogFileLocation: true,
            location: path
        });
        initialEditing = false;
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
    let initialEditing = false;
</script>

<template>
    <div v-if="finishedLoading">
        <h1>Logging</h1>
        <div v-if="webhookURL != 'disabled'">
            Webhook url: <TextInput @set="setWebhookURL" :default="webhookURL" placeholder="The URL" /> <button @click="setWebhookURL('disabled')">Disable</button>
        </div>
        <div v-else>
            Webhooks are disabled. <button @click="initialEditing = true; webhookURL = ''">Enable</button>
        </div>
        <br/>
        <div v-if="logPath != 'disabled'">
            Log path: <TextInput @set="setLogPath" :default="logPath" placeholder="The Path" /> <button @click="setLogPath('disabled')">Disable</button>
        </div>
        <div v-else>
            Logging to file is disabled. <button @click="initialEditing = true; logPath = ''">Enable</button>
        </div>
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