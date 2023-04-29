<script setup lang="ts">
import { Ref, computed, inject } from 'vue';
import type { User } from "../../../Share/User";
import { useRouter } from 'vue-router';
import TextInput from '../components/TextInput.vue';
import event from '../util/event';
import { Server } from '../../../Share/Server';
import { hasPermission } from '../../../Share/Permission';

let router = useRouter();
let servers = inject("servers") as Ref<Server[]>;
let user = inject("loginStatus") as Ref<User>;
if(!user.value.setupPending) {
    router.push({
        name: "Home"
    });
}
async function changePassword(password: string) {
    event.emit("sendPacket", {
        type: "editUser",
        id: user.value._id,
        action: "changePassword",
        password
    });
    let resp = await event.awaitEvent("editUser-" + user.value._id);
    event.emit("createNotification", resp.success ? "Your password has been changed!" : ("Error: " + resp.message));
}
let usedFormat: Ref<['days' | 'hour' | 'minute' | 'second', number]> = computed(() => { // there has to be a better way to do this
    let msDiff = Date.now() - new Date(user.value.createdAt).getTime();
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
    router.push(cbQuery ?? "/");
}
async function finish() {
    event.emit("sendPacket", {
        type: "editUser",
        id: user.value._id,
        action: "finishSetup"
    });
    let resp = await event.awaitEvent("editUser-" + user.value._id);
    if(!resp.success) {
        event.emit("createNotification", resp.message);
        return;
    }
    gotoCB();
}
</script>
<template>
    <h1>Welcome to your new account, {{ user?.username }}!</h1>
    <br/>
    <p>Your user was created {{ new Intl.RelativeTimeFormat(undefined, {numeric: "auto"}).format(0-usedFormat[1], usedFormat[0]) }} ({{ new Intl.DateTimeFormat(undefined, {year: "numeric", month: "long", day: "numeric", weekday: "long", hour: "2-digit", minute: "2-digit", second: "2-digit"}).format(new Date(user.createdAt)) }})</p>
    <br/>
    <b><p>Set your password:</p></b>
    <TextInput :default="''" @set="changePassword" placeholder="Password" :password="true" />
    <br/>
    <br/>
    <div v-if="servers.length != 0">
        <h3>You have access to {{ servers.length }} server{{ servers.length == 1 ? "" : "s" }}!</h3>
        <div v-for="server of servers">
            {{ server.name }}
        </div>
    </div>
    <div v-else>
        <h3>You do not have access to any servers{{ hasPermission(user, "servers.create") ? " but you can make one after you finished the setup" : "" }}!</h3>
    </div>
    <br/>
    <button @click="finish">Finish setup</button>
</template>