<script setup lang="ts">
import TextInput from '@components/TextInput.vue';
import event from '@util/event';
import sendRequest from '@util/request';
import { confirmModal } from '@util/modal';
import { useUser } from '@stores/user';

const user = useUser();

async function resetToken() {
    if (!await confirmModal("Reset your token?", "Sure? All sessions except this one will be logged out. Auto-login will break for other sessions."))
        return;
    let resp = await sendRequest("editUser", {
        id: user.user?.id,
        action: "resetToken",
    });
    if(resp?.token) localStorage.setItem("token", resp.token);
    event.emit("createNotification", "Your token has been reset!");
}

async function setUsername(newName: string) {
    await sendRequest("editUser", {
        id: user.user?.id,
        action: "changeUsername",
        username: newName
    })
    event.emit("createNotification", "Your name has been changed!");
}

async function changePassword(password: string) {
    await sendRequest("editUser", {
        id: user.user?.id,
        action: "changePassword",
        password
    })
    event.emit("createNotification", "Your password has been changed!");
} // copy pasted from usersetup
// it does that already
</script>
<template>
    <div class="container">
        <h2>Welcome, {{ user.user?.username || "[unknown username]" }}!</h2>
        <h3>User settings</h3>
        <TextInput @set="setUsername" :default="user.user?.username || ''" placeholder="Username"></TextInput>
        <br/>
        <TextInput :default="''" :password="true" @set="changePassword" placeholder="Password"></TextInput>
        <br/>
        <div class="btns"><button @click="resetToken">Reset token</button><button @click="user.logout">Logout</button></div>
    </div>
</template>

<style scoped>

h3 {
    margin-bottom: 10px;
    color: #b7b7b7;
}

h2 {
    margin-bottom: 10px;
}

h2, h3, .btns {
    text-align: center;
    justify-content: center;
    align-self: center;
    align-items: center;
}

.container {
    width: max-content;
    max-width: 600px;
    margin: auto;
    padding: 20px;
    border: 1px solid #333030;
    border-radius: 10px;
    background-color: #201f1f;
    /* vertical center */
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

br {
    margin: 10px;
}

button {
    margin-top: 5px;
    margin-right: 5px;
}
</style>