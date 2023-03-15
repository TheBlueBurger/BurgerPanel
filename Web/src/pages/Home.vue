<script setup lang="ts">
import { inject, ref, Ref } from 'vue';
import { User } from '../../../Share/User';
import Perf from '../components/Perf.vue';
import EventEmitter from '../util/event';
</script>

<template>
    <Perf />
</template>

<style scoped>
    * {
        padding: 10px;
    }
</style>