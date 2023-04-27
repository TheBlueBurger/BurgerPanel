<script setup lang="ts">
import { Ref, inject } from 'vue';
import { User } from '../../../Share/User';
import TextInput from '../components/TextInput.vue';
import event from '../util/event';

let loginStatus = inject("loginStatus") as Ref<User>;

async function resetToken() {
    if (!confirm("Sure? All sessions except this one will be logged out. Auto-login will break for other sessions."))
        return;
    event.emit("sendPacket", {
        type: "editUser",
        id: loginStatus.value._id,
        action: "resetToken",
    });
    
    let resp = await event.awaitEvent("editUser-" + loginStatus.value._id);
    if(resp.success) localStorage.setItem("token", resp.newToken);
    event.emit("createNotification", resp.success ? "Your token has been reset!" : ("Error: " + resp.message));
}

async function setUsername(newName: string) {
    event.emit("sendPacket", {
        type: "editUser",
        id: loginStatus.value._id,
        action: "changeUsername",
        username: newName
    });
    let resp = await event.awaitEvent("editUser-" + loginStatus.value._id);
    event.emit("createNotification", resp.success ? "Your name has been changed!" : ("Error: " + resp.message));
}
// my "Set" event triggers whenever u press enter or "Set"

async function changePassword(password: string) {
    event.emit("sendPacket", {
        type: "editUser",
        id: loginStatus.value._id,
        action: "changePassword",
        password
    });
    let resp = await event.awaitEvent("editUser-" + loginStatus.value._id);
    event.emit("createNotification", resp.success ? "Your password has been changed!" : ("Error: " + resp.message));
} // copy pasted from usersetup
// it does that already
</script>
<template>
    <TextInput class="username" @set="setUsername" :default="loginStatus.username" placeholder="Username"></TextInput>
    <br/>
    <TextInput :default="''" :password="true" @set="changePassword" placeholder="Password"></TextInput>
    <br/>
    <button @click="resetToken">Reset token</button>
</template>