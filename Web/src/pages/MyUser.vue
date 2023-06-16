<script setup lang="ts">
import TextInput from '@components/TextInput.vue';
import event from '../util/event';
import sendRequest from '../util/request';
import { confirmModal } from '../util/modal';
import { useUser } from '../stores/user';

const user = useUser();

async function resetToken() {
    if (!await confirmModal("Reset your token?", "Sure? All sessions except this one will be logged out. Auto-login will break for other sessions."))
        return;
    let resp = await sendRequest("editUser", {
        id: user.user?._id,
        action: "resetToken",
    });
    if(resp?.token) localStorage.setItem("token", resp.token);
    event.emit("createNotification", "Your token has been reset!");
}

async function setUsername(newName: string) {
    await sendRequest("editUser", {
        id: user.user?._id,
        action: "changeUsername",
        username: newName
    })
    event.emit("createNotification", "Your name has been changed!");
}

async function changePassword(password: string) {
    await sendRequest("editUser", {
        id: user.user?._id,
        action: "changePassword",
        password
    })
    event.emit("createNotification", "Your password has been changed!");
} // copy pasted from usersetup
// it does that already
</script>
<template>
    <TextInput @set="setUsername" :default="user.user?.username || ''" placeholder="Username"></TextInput>
    <br/>
    <TextInput :default="''" :password="true" @set="changePassword" placeholder="Password"></TextInput>
    <br/>
    <button @click="resetToken">Reset token</button>
</template>