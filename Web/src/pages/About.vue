<script setup lang="ts">
    import { buildInfo } from "@share/BuildInfo";
</script>

<template>
    <div id="main-about">
        <h1>About Burgerpanel</h1>
        <p>Burgerpanel is an open-source Minecraft Panel, created to be simple to use.</p>
        <p>Burgerpanel is licensed under the <a href="https://www.gnu.org/licenses/agpl-3.0.en.html" target="_blank">AGPLv3 License</a></p>
        <p style="margin: 10px;"><a href="https://github.com/TheBlueBurger/BurgerPanel" target="_blank">Github repository</a></p>
        <h3>Credits</h3>
        <p>- <a href="https://github.com/TheBlueBurger" target="_blank">TheBlueBurger</a>: Most backend, most frontend, some CSS</p>
        <p>- <a href="https://github.com/TheRedXD" target="_blank">_TheRedex</a>: Some css, notification system</p>
        <p>- <a href="https://github.com/ArrayBuffer01" target="_blank">ArrayBuffer01</a>: Helping with backend and frontend</p>
        <br/>
        <h3>Build Info</h3>
        <p>Version v{{ buildInfo.version }}</p>
        <p>Built on {{ new Date(buildInfo.date).toLocaleString() }} by {{ buildInfo.compiledBy }} on {{ buildInfo.builtOn }}</p>
        <p>Git Branch: {{ buildInfo.branch }}</p>
        <p>Git Commit Hash: <a :href="'https://github.com/TheBlueBurger/BurgerPanel/commit/'+buildInfo.gitHash" target="_blank">{{ buildInfo.gitHash }}</a></p>
    </div>
</template>

<style scoped>
    #main-about {
        margin: 20px 40px;
    }
    h1 {
        font-size: 40px;
        margin-bottom: 10px;
    }
    a {
        color: #81d5ff;
        transition: all 0.1s ease-in-out;
        text-decoration: none;
    }
    a:hover {
        color: #c3ecff;
        text-decoration: underline;
    }
</style>