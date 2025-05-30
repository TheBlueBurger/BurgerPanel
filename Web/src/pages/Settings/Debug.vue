<script setup lang="ts">
import { Ref, inject, ref } from 'vue';
let settings = useSettings();
import { User } from '@share/User';
import packets from '@share/Packets';
import sendRequest from '@util/request';
import { requestModal, showInfoBox } from '@util/modal';
import { RequestResponses } from '@share/Requests';
import { useUser } from '@stores/user';
import { useUsers } from '@stores/users';
import { useSettings } from '@stores/settings';
import Dropdown from '@components/Dropdown.vue';
import { buildInfo } from '@share/BuildInfo';
let showWarning = ref(import.meta.env.PROD);
const user = useUser();
const users = useUsers();
let allUsers: Ref<User[]> = ref([]);
let packetName: Ref<typeof packets[number] | undefined> = ref();
let packetData = ref(`{

}`);
let requestResponse = ref("");
let modalInputData = ref(`{

}`);
let shownSettings = ref();
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
    shownSettings.value = await settings.getAllSettings();
}
async function showUsers() {
    allUsers.value = await users.getAllUsers();
}
async function toggleDevMode() {
    user.user = (await sendRequest("editUser", {
        id: user.user?.id,
        action: "toggleDev"
    })).user;
}
let API_URL = inject("API_URL");
let dropdown = ref();
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
    <button @click="e => dropdown.show(e)">Dropdown</button>
    <div @focus="dropdown.hide()">
        <Dropdown ref="dropdown" :create-on-cursor="true">
            Hello World!
        </Dropdown>
    </div>
    <h2>My user</h2>
    <pre>{{ user.user }}</pre>
    <hr/>
    <h2>Settings</h2>
    <div v-if="shownSettings">
        <pre>{{ shownSettings }}</pre>
    </div>
    <div v-else>
        <button @click="showSettings">Get</button>
    </div>
    <hr/>
    <h1>Users</h1>
    <div v-if="allUsers.length != 0" v-for="user in allUsers">
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
        <br/>
        <button @click="sendPacket">Send</button>
        <h3>Output</h3>
        <textarea readonly v-model="requestResponse" :style="{width: '500px', height: '250px'}" />
    </div>
    <hr/>
    <h1>Modal debug</h1>
    <textarea v-model="modalInputData" :style="{width: '500px', height: '250px'}" />
    <br/>
    <button @click="createModal">Create modal</button>
    <h3>Output</h3>
    <textarea readonly v-model="modalOutputData" :style="{width: '500px', height: '250px'}"></textarea>
    <hr/>
    <h1>Build Info</h1>
    <p v-for="info of Object.keys(buildInfo)">
        {{ info }}: {{ // @ts-ignore typescript stupidity
        buildInfo[info] }}
    </p>
    <hr>
    <h1>Developer mode</h1>
        <p>Developer mode for your account is currently <b>{{ user.user?.devMode ? "enabled" : "disabled" }}</b>.</p>
        <button @click="toggleDevMode">{{ user.user?.devMode ? "Disable" : "Enable" }}</button>
        <div v-if="user.user?.devMode">
            Example:<br/>
            <div :style="{backgroundColor: '#000000', width: 'fit-content', padding: '10px', margin: '10px', borderRadius: '5px'}">curl {{ API_URL }}/api/request/auth \<br/>
                --request POST \<br/>
                --header "Content-Type: application/json" \<br/>
                --header "Authorization: {{ user.user.token }}" \<br/>
                --data "{}"
            </div>
            To get your current login data. See <a href="https://github.com/TheBlueBurger/BurgerPanel/tree/master/Server/src/packets" target="_blank"> here</a> for all types and <a href="https://github.com/TheBlueBurger/BurgerPanel/blob/master/Share/Requests.ts" target="_blank">here</a> for their responses.
            <br/>
            <br/>
        </div>
    <hr/>
    Need help? <a href="https://github.com/TheBlueBurger/BurgerPanel/discussions/new?category=support" target="_blank">Create a support ticket</a>
</div>
</template>