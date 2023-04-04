<script setup lang="ts">
    import { onMounted, ref } from 'vue';
    import { getSetting } from '../util/config';
    
    let webhookURL = ref("");
    let finishedLoading = ref(false);
    onMounted(async () => {
        webhookURL.value = await getSetting("logging_DiscordWebHookURL");
        finishedLoading.value = true;
    });
    
</script>

<template>
    <div v-if="finishedLoading">
        Webhook url: {{ webhookURL }}
    </div>
    <div v-else>
        Loading!!!!!!!
    </div>
</template>