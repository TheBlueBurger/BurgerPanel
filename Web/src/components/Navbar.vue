<script setup lang="ts">
import { inject, Ref } from 'vue';
import { User } from '../../../Share/User';
import EventEmitter from '../util/event';
let events: Ref<typeof EventEmitter> = inject('events') as Ref<typeof EventEmitter>;
let loginStatus: Ref<User | null> = inject('loginStatus') as Ref<User | null>;
function logout() {
    events.value.emit("requestLogout");
}
</script>
<template>
    <div id="navbar">
        <span id="title"><RouterLink to="/" class="no-text-dec">Burgerpanel</RouterLink></span>
        <div v-if="loginStatus?.username" class="loggedin-only">
            <span class="item link"><RouterLink to="/manage">Servers</RouterLink></span>
          <span class="item link" v-if="loginStatus?.admin"><RouterLink to="/settings">Settings</RouterLink></span>
          <span class="item link"><RouterLink to="/about">About</RouterLink></span>
          <!-- Top left -->
         <span id="user" class="item" v-if="loginStatus?.username">{{ loginStatus?.username + (loginStatus.admin ? " (Admin)" : " (User)")}} <button @click="logout">Log out</button></span>
        </div>
    </div>
</template>

<style scoped>
    #navbar::-webkit-scrollbar {
        display: none;
    }
    #navbar {
        background-color: #1d1c1c;
        width: 100%;
        margin-top: 0;
        height: 50px;
        display: flex;
        align-items: center;
        overflow: scroll;
        scrollbar-width: none;
    }
    #title {
        color: white;
        font-size: 30px;
        cursor: pointer;
        margin-left: 5px;
    }
    .no-text-dec {
        text-decoration: none;
        color: white;
    }
    .link > * {
        color: white;
        font-size: 20px;
        padding-left: 25px;
        cursor: pointer;
        text-decoration: none;
    }
    #user {
        margin-left: auto;
        margin-right: 10px;
    }
    .loggedin-only {
        width: 100%;
        margin-top: 0;
        height: 50px;
        display: flex;
        align-items: center;
    }
</style>