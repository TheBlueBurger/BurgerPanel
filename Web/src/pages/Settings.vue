<script setup lang="ts">
import { computed, inject, Ref, ref } from "vue";
import { Config, defaultConfig, descriptions, disabledEditingFrontend } from "../../../Share/Config.js";
import { User } from "../../../Share/User.js";
import { setSetting, getAllSettings } from "../util/config";
import EventEmitter from "../util/event";
import { useRouter } from "vue-router";
import { hasPermission } from "../../../Share/Permission";
import getUsers from "../util/getUsers";
import TextInput from "../components/TextInput.vue";
import sendRequest from "../util/request";
import titleManager from "../util/titleManager";
import { confirmModal, showInfoBox } from "../util/modal";
import { useUser } from "../stores/user";
let router = useRouter();
const user = useUser();
let events: Ref<typeof EventEmitter> = inject("events") as Ref<typeof EventEmitter>;
if (!user.hasPermission("settings.read") && !user.hasPermission("users.view")) {
    events.value.emit("createNotification", "You do not have permission! Get out of here!");
    router.push({
        path: "/"
    });
}
let knownSettings = inject("knownSettings") as Ref<{ [key in keyof Config]: any }>;
async function changeOption(option: keyof typeof defaultConfig, newValue: string) {
    try {
        if (!newValue) return;
        let val = await setSetting(option, newValue);
        knownSettings.value = await getAllSettings();
        events.value.emit("createNotification", "Successfully changed option")
    } catch (e) {
        showInfoBox(`Could not change '${option}'`, `Error: ${e}`);
    }
}
getAllSettings();
let cachedUsers = inject("users") as Ref<Map<string, User>>

let creatingUser = ref(false);
let newUsername = ref("");
async function createUser() {
    let resp = await sendRequest("createUser", {
        username: newUsername.value
    })
    newUsername.value = "";
    creatingUser.value = false;
    events.value.emit("createNotification", "User " + resp.user.username + " created");
    getUsers(cachedUsers.value, true);
}
getUsers(cachedUsers.value, true);
async function deleteUser(user: User) {
    if(!await confirmModal("Delete user?", "Are you sure you want to remove the user " + user.username + "?")) return;
    await sendRequest("deleteUser", {
        id: user._id
    })
    getUsers(cachedUsers.value, true);
}

let knownTokens: Ref<{[id: string]: string}> = ref({});
let viewingToken = ref("");
async function getToken(userID: string) {
    let resp = await sendRequest("getUserToken", {
        id: userID
    })
    knownTokens.value[userID] = resp.token;
    return resp.token;
}
async function viewToken(userID: string, copy: boolean = false) {
    if (viewingToken.value == userID) {
        viewingToken.value = "";
        return;
    }
    if (knownTokens.value[userID] && !copy) viewingToken.value == userID ? "" : userID;
    let token = await getToken(userID);
    if (!copy) viewingToken.value = userID;
    else copyToClip(token);
}
async function copyLoginURL(userID: string) {
    let token = await getToken(userID);
    copyToClip(`${location.origin}/?useToken=${token}`);
}
function copyToClip(text: string) {
    navigator.clipboard.writeText(text);
    events.value.emit("createNotification", "Copied to clipboard");
}
let sortedUsers = computed(() => {
    return [...cachedUsers.value.values()].sort((a,b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
});
let settingsAllowedToShow = computed(() => {
    return Object.keys(defaultConfig).filter(c => {
        return !disabledEditingFrontend.some(d => c.startsWith(d))
    })
});
async function resetToken(id: string) {
    if (!await confirmModal("Reset token", "All sessions will be logged out. Auto-login will break for all sessions."))
        return;
    await sendRequest("editUser", {
        action: "resetToken",
        id
    })
    events.value.emit("createNotification", "Token has been reset!");
}
titleManager.setTitle("Settings")
</script>
<template>
    <div v-if="user.hasPermission('settings.read')">
        <h2>Settings</h2>
        <div v-for="option of settingsAllowedToShow">
            <span class="setting-span" :title="descriptions[option as keyof typeof defaultConfig]">{{ option }}</span>
            <TextInput :default="knownSettings[option as keyof Config].toString()" @set="v => changeOption(option as keyof Config, v)" v-if="typeof knownSettings[option as keyof Config] != 'undefined'" />
        </div>
    </div>
    <div v-if="user.hasPermission('settings.logging.set')">
        <RouterLink :to="{
            name: 'logging'
        }"><button>Logging Settings</button></RouterLink>
    </div>
    <hr v-if="user.hasPermission('users.view')" />
    <h3>Users</h3>
    <div>
        <button @click="creatingUser = !creatingUser">{{ !creatingUser ? "Add user" : "Close" }}</button>
    </div>
    <div v-if="creatingUser">
        <form @submit.prevent="createUser()">
            Username: <input type="text" placeholder="Username" v-model="newUsername" /><br />
            <button type="submit">Create user</button>
        </form>
    </div>
    <table>
        <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Created At</th>
            <th>Token</th>
            <th>Permissions</th>
            <th v-if="user.hasPermission('users.delete')">Delete</th>
        </tr>
        <tr v-for="_user in sortedUsers" :key="_user._id">
            <td>{{ _user._id }}</td>
                <td>{{ _user.username }}</td>
                <td>{{ new Date(_user.createdAt).toLocaleString() }}</td>
                <td>
                    {{ viewingToken == _user._id ? knownTokens[_user._id] : "<Hidden>" }} <button @click="viewToken(_user._id)">{{viewingToken == _user._id ? "Hide" : "View" }}
                token</button> <button @click="viewToken(_user._id, true)">Copy to clipboard</button> <button @click="copyLoginURL(_user._id)">Generate login url</button> <button @click="resetToken(_user._id)" v-if="user.hasPermission('users.token.reset')">Reset Token</button>
                </td>
                <td><RouterLink :to="{
                name: 'editUserPermissions',
                params: {
                    user: _user._id
                }
            }"><button>Edit permissions</button></RouterLink></td>
            <td>
                <button @click="deleteUser(_user)" v-if="user">Delete</button>
            </td>
        </tr>
    </table>
</template>
<style scoped>
.setting-span {
    cursor: help;
    margin-right: 10px;
}
table {
    width: 100%;
}
table > tr > th {
    /* Center */
    text-align: left;
    margin-left: 100;
}
td, th, .manage-btn {
  border: 1px solid #dddddd;
  text-align: left;
  padding: 8px;
}
tr:nth-child(even) {
  background-color: #383535;
}
</style>
