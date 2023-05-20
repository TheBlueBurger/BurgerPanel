<script setup lang="ts">
import { useRouter } from 'vue-router';
import titleManager from '../util/titleManager';

let router = useRouter();
titleManager.setTitle("404 Not Found")
</script>

<template>
    <div>
        <h1>404</h1>
        <p>The page at <code>{{ router.currentRoute.value.path }}</code> was not found.</p>
        <RouterLink :to="{name: 'Home'}">Go home</RouterLink>
    </div>
</template>

<style scoped>
    div {
        background-color: #272525;
        align-items: center;
        text-align: center;
        margin: auto;
        width: fit-content;
        padding: 10px;
        border-radius: 10px;
        margin-top: 10px;
    }
    h1 {
        font-size: 10em;
    }
    p {
        font-size: 2em;
        margin-bottom: 25px;
    }
    a {
        text-decoration: none;
        font-size: 3em;
        display: flexbox;
        color: white;
    }
    code {
        background-color: #1a1919;
        border-radius: 6px;
    }
</style>
