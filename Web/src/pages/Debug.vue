<script setup lang="ts">
import { Ref, inject, ref } from 'vue';
import { getAllSettings } from '../util/config';
import { User } from '../../../Share/User';
import packets from '../../../Share/Packets';
import sendRequest from '../util/request';
import { requestModal, showInfoBox } from '../util/modal';
import { RequestResponses } from '../../../Share/Requests';
import { useUser } from '../stores/user';
import { useUsers } from '../stores/users';
let showWarning = ref(true);
const user = useUser();
const users = useUsers();
let settings: Ref<Awaited<ReturnType<typeof getAllSettings>> | undefined> = ref();
let allUsers: Ref<User[]> = ref([]);
let packetName: Ref<typeof packets[number] | undefined> = ref();
let packetData = ref(`{

}`);
let requestResponse = ref("");
let modalInputData = ref(`{

}`);
let modalOutputData = ref("");
async function sendPacket() {
    let data;
    try {
        data = JSON.parse(packetData.value);
    } catch(err) {
        showInfoBox("Error while parsing JSON", `${err}`)
        return;
    }
    requestResponse.value = JSON.stringify(await sendRequest(packetName.value as keyof RequestResponses, data), null, 2);
}
async function createModal() {
    let data;
    try {
        data = JSON.parse(modalInputData.value);
    } catch(err) {
        showInfoBox("Error while parsing JSON", `${err}`)
        return;
    }
    modalOutputData.value = JSON.stringify(await requestModal(data), null, 2);
}
async function showSettings() {
    settings.value = await getAllSettings();
}
async function showUsers() {
    allUsers.value = await users.getAllUsers();
}
</script>

<template>
<div v-if="showWarning">
    <h1>WARNING</h1>
    <p>This is a page for debugging Burgerpanel. It should not be screenshotted, screenshared, or shared in any other way with anyone you do not trust.</p>
    <p>Your own token and hashed password will be visible</p>
    <p>Some data of other users may be viewed.</p>
    <br/>
    <p>Are you sure you want to open this?</p>
    <button @click="showWarning = false">I understand the risks</button>
</div>
<div v-else>
    <h2>My user</h2>
    <pre>{{ user.user }}</pre>
    <hr/>
    <h2>Settings</h2>
    <div v-if="settings">
        <pre>{{ settings }}</pre>
    </div>
    <div v-else>
        <button @click="showSettings">Get</button>
    </div>
    <hr/>
    <h1>Users</h1>
    <div v-if="allUsers" v-for="user in allUsers">
        <pre>{{ user }}</pre>
    </div>
    <div v-else>
        <button @click="showUsers">Get</button>
    </div>
    <hr/>
    <div>
        <h1>Request sender</h1>
        <select v-model="packetName">
            <option v-for="packet in packets">
                {{ packet }}
            </option>
        </select>
    </div>
    <div v-if="packetName">
        <textarea v-model="packetData" :style="{width: '500px', height: '250px'}" />
    </div>
    <button @click="sendPacket">Send</button>
    <h3>Output</h3>
    <textarea readonly v-model="requestResponse" :style="{width: '500px', height: '250px'}" />
    <hr/>
    <h1>Modal debug</h1>
    <textarea v-model="modalInputData" :style="{width: '500px', height: '250px'}" />
    <br/>
    <button @click="createModal">Create modal</button>
    <h3>Output</h3>
    <textarea readonly v-model="modalOutputData" :style="{width: '500px', height: '250px'}"></textarea>
    <hr/>
    Need help? <a href="https://github.com/TheBlueBurger/BurgerPanel/discussions/new?category=support" target="_blank">Create a support ticket</a>
</div>
</template>