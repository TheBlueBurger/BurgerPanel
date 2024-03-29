<script setup lang="ts">
    import { ref } from 'vue';
    import { useSettings } from '@stores/settings';
    import { IDs } from "@share/Logging";
    import TextInput from '@components/TextInput.vue';
    import sendRequest from '@util/request';
    let settings = useSettings();
    let logPath = ref("");
    let webhookURL = ref("");
    let finishedLoading = ref(false);
    let disabledLogs = ref([] as typeof IDs[number][]);
    async function load(reload: boolean = false) {
        await Promise.all([
            (async() => {
                webhookURL.value = await settings.getSetting("logging_DiscordWebHookURL", reload) as string;
            })(),
            (async() => {
                disabledLogs.value = (await settings.getSetting("logging_DisabledIDs", reload) as string).split(",") as any;
            })(),
            (async() => {
                logPath.value = await settings.getSetting("logging_logDir", reload) as string;
            })()
        ])
    }
    await load();
    finishedLoading.value = true;
    function isDisabled(id: typeof IDs[number]) {
        return disabledLogs.value.includes(id);
    }
    async function setWebhookURL(url: string) {
        await sendRequest("logging", {
            setWebhookURL: true,
            url
        });
        initialEditing = false;
        await load(true);
    }
    async function setLogPath(path: string) {
        await sendRequest("logging", {
            setLogFileLocation: true,
            location: path
        });
        initialEditing = false;
        await load(true);
    }
    async function toggle(id: typeof IDs[number]) {
        await sendRequest("logging", {
            setLogFileLocation: true,
            setLoggingTypeEnabled: true,
            id,
            enabled: isDisabled(id)
        });
        await load(true);
    }
    let initialEditing = false;
</script>

<template>
    <div v-if="finishedLoading" class="container">
        <h1>Logging</h1>
        <div v-if="webhookURL != 'disabled'" class="webhook">
            Webhook url: <TextInput @set="setWebhookURL" :default="webhookURL" placeholder="The URL" /> <button @click="setWebhookURL('disabled')">Disable</button>
        </div>
        <div v-else class="webhook">
            Webhooks are disabled. <button @click="initialEditing = true; webhookURL = ''">Enable</button>
        </div>
        <div v-if="logPath != 'disabled'" class="logpath">
            Log path:
            <TextInput @set="setLogPath" :default="logPath" placeholder="The Path" /> <button @click="setLogPath('disabled')">Disable</button>
        </div>
        <div v-else class="logpath">
            Logging to file is disabled. <button @click="initialEditing = true; logPath = ''">Enable</button>
        </div>
        <p><b>For security reasons, changing or disabling the log path will require a server restart.</b></p>
        <br/>
        <h3>Log Events</h3>
        <p><b>Note:</b> This will only apply for webhooks. For security reasons everything will be logged to the terminal and log file.</p>
        <div v-for="id in IDs" class="logevents-id">
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
.container 
.red {
    color: red;
}
.green {
    color: green;
}

.logevents-id {
    margin-bottom: 5px;
    margin-left: 30px;
}

.logevents-id:last-of-type {
    margin-bottom: 20px;
}

p {
    margin-left: 20px;
    margin-bottom: 10px;
}

h3 {
    margin-bottom: 10px;
    color: #b7b7b7;
    margin-left: 20px;
}

h1 {
    margin-bottom: 10px;
    margin-top: 10px;
    margin-left: 20px;
}

.webhook, .logpath {
    margin-left: 20px;
    margin-bottom: 10px;
}
</style>