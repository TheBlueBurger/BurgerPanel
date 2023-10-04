<script setup lang="ts">
import SystemInfo from '@components/SystemInfo.vue';
import titleManager from '@util/titleManager';
import Server from '@components/Server.vue';
import { useServers } from '@stores/servers';
titleManager.setTitle("Home");
let servers = useServers();
let pinnedServers = await servers.getPinnedServers();
</script>

<template>
    <div class="home-container">
        <SystemInfo />
        <div id="servers-container">
            <Server v-for="pinnedServer of pinnedServers" :server="pinnedServer" />
        </div>
    </div>
</template>

<style scoped>
    .home-container {
        margin: 10px;
        display: block;
    }
    * {
        padding: 10px;
    }
    #servers-container {
        display: flex;
        flex-wrap:wrap;
        justify-content: center;
        position: relative;
        box-sizing: border-box;
    }
</style>