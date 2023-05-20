<script setup lang="ts">
import Perf from '../components/Perf.vue';
import titleManager from '../util/titleManager';
titleManager.setTitle("Home");
</script>

<template>
    <Perf />
</template>

<style scoped>
    * {
        padding: 10px;
    }
</style>