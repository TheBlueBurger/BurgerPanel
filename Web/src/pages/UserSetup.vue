<script setup lang="ts">
import { Ref, computed, inject } from 'vue';
import type { User } from "../../../Share/User";
import { useRouter } from 'vue-router';
import TextInput from '../components/TextInput.vue';
import event from '../util/event';
import { Server } from '../../../Share/Server';
import sendRequest from '../util/request';
import { useUser } from '../stores/user';
import { useServers } from '../stores/servers';

let router = useRouter();
let servers = useServers();
let user = useUser();
if(!user.user?.setupPending) {
    router.push({
        name: "Home"
    });
}
async function changePassword(password: string) {
    await sendRequest("editUser", {
        id: user.user?._id,
        action: "changePassword",
        password
    });
    event.emit("createNotification", "Your password has been changed!");
}
let usedFormat: Ref<['days' | 'hour' | 'minute' | 'second', number]> = computed(() => { // there has to be a better way to do this
    let msDiff = Date.now() - new Date(user.user?.createdAt || Date.now()).getTime();
    const diffInSeconds = msDiff / 1000;
    const diffInMinutes = diffInSeconds / 60;
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;
    if (diffInDays >= 1) {
        return ["days", diffInDays];
    } else if (diffInHours >= 1) {
        return ['hour', diffInHours];
    } else if (diffInMinutes >= 1) {
        return ['minute', diffInMinutes];
    } else {
        return ['second', diffInSeconds];
    }
});
function gotoCB() {
    let cbQuery = router.currentRoute.value.query.cb;
    if(cbQuery) cbQuery = cbQuery.toString();
    console.log("Pushing",cbQuery ?? "/")
    router.push(cbQuery ?? "/");
}
async function finish() {
    await sendRequest("editUser", {
        id: user.user?._id,
        action: "finishSetup"
    });
    console.log("here")
    gotoCB();
}
</script>
<template>
    <h1>Welcome to your new account, {{ user.user?.username }}!</h1>
    <br/>
    <p>Your user was created {{ new Intl.RelativeTimeFormat(undefined, {numeric: "auto"}).format(0-usedFormat[1], usedFormat[0]) }} ({{ new Intl.DateTimeFormat(undefined, {year: "numeric", month: "long", day: "numeric", weekday: "long", hour: "2-digit", minute: "2-digit", second: "2-digit"}).format(new Date(user.user?.createdAt || Date.now())) }})</p>
    <br/>
    <b><p>Set your password:</p></b>
    <TextInput :default="''" @set="changePassword" placeholder="Password" :password="true" />
    <br/>
    <br/>
    <div v-if="servers.assignedServers.length != 0">
        <h3>You have access to {{ servers.assignedServers }} server{{ servers.assignedServers.length == 1 ? "" : "s" }}!</h3>
        <div v-for="server of servers.assignedServers">
            {{ server.name }}
        </div>
    </div>
    <div v-else>
        <h3>You do not have access to any servers{{ user.hasPermission('servers.create') ? " but you can make one after you finished the setup" : "" }}!</h3>
    </div>
    <br/>
    <button @click="finish">Finish setup</button>
</template>