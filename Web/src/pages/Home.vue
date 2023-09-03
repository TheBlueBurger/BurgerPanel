<script setup lang="ts">
import Perf from '@components/Perf.vue';
import titleManager from '@util/titleManager';
import Server from '@components/Server.vue';
import { useServers } from '@stores/servers';
titleManager.setTitle("Home");
let servers = useServers();
let pinnedServers = await servers.getPinnedServers();
</script>

<template>
    <Perf />
    <div id="servers-container">
        <Server v-for="pinnedServer of pinnedServers" :server="pinnedServer" />
    </div>
</template>

<style scoped>
    * {
        padding: 10px;
    }
    #servers-container {
        display: flex;
        flex-wrap:wrap;
        justify-content: center;
    }
</style>