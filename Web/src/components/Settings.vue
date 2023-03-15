<script setup lang="ts">
import { inject, Ref, ref, watchEffect } from "vue";
import { Config, defaultConfig, descriptions } from "../../../Share/Config.js";
import { User } from "../../../Share/User.js";
import { setSetting, getAllSettings } from "../util/config";
import EventEmitter from "../util/event";
let knownSettings = inject("knownSettings") as Ref<{ [key in keyof Config]: any }>;
let e = defineEmits(['changeOption', 'requestOption', 'getUserlist', "toggleAdmin", "createUser", "deleteUser"]);
let props = defineProps<{
    users: User[];
    events: typeof EventEmitter;
}>();
async function changeOption(option: keyof typeof defaultConfig) {
    let newValue = prompt("New value for " + option + "\n" + descriptions[option], knownSettings.value[option] ?? "");
    try {
        await setSetting(option, newValue);
        knownSettings.value[option] = newValue; // I KNOW THIS ISNT NEEDED BUT VUE IS BEING STUPID
        alert("Option set to " + newValue);
    } catch (e) {
        alert("Failed to set option: " + e);
    }
}
(async () => {
    try {
        await getAllSettings();
    } catch(err) {
        alert("Failed to get settings: " + err);
    }
})();
function getUserlist() {
    e('getUserlist');
}
function toggleAdmin(user: User) {
    e('toggleAdmin', user);
}
let creatingUser = ref(false);
let newUsername = ref("");
let newAdmin = ref(false);
function createUser() {
    e('createUser', newUsername.value, newAdmin.value);
    newUsername.value = "";
    newAdmin.value = false;
    creatingUser.value = false;
}
async function deleteUser(user: User) {
    if (confirm("Are you sure you want to delete this user?")) {
        e('deleteUser', user);
        let resp = await props.events.awaitEvent("deleteUser");
        if (resp?.success) {
            alert("User " + user.username + " deleted");
        } else {
            alert("Failed to delete user: " + resp.message);
        }
        getUserlist();
    }
}
getUserlist();
let viewingToken = ref("");
function copyToClip(text: string) {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard");
}
</script>
<template>
    <h2>Settings</h2>
    <div v-for="option of Object.keys(defaultConfig)">
        {{ option }}{{ typeof knownSettings[option as keyof typeof defaultConfig] != "undefined" ? ": " + (knownSettings[option as keyof typeof defaultConfig] === "" ? "<Empty string> ": knownSettings[option as keyof typeof defaultConfig]) : ": <Unknown>" }} <button
                @click="() => changeOption(option as keyof typeof defaultConfig)">Edit</button>
    </div>
    <!-- User list part -->
    <hr />
    <h3>Users</h3>
    <div v-if="users.length == 0">
        <button @click="getUserlist()">Request users</button>
    </div>
    <div>
        <button @click="creatingUser = !creatingUser">Add user</button>
    </div>
    <div v-if="creatingUser">
        Username: <input type="text" placeholder="Username" v-model="newUsername" /><br />
        Admin: <input type="checkbox" v-model="newAdmin" /><br />
        <button @click="createUser()">Create user</button>
    </div>
    <div v-for="user of props.users">
        <hr>
        ID: {{ user._id }} <button @click="deleteUser(user)">Delete</button>
        <br>
        Username: {{ user.username }}
        <br>
        Admin: {{ user.admin ? "Yes" : "No" }} <button @click="toggleAdmin(user)">Toggle admin status</button>
        <br>
        Created at: {{ new Date(user.createdAt).toLocaleString() }}
        <br>
        Token: {{ viewingToken == user._id ? user.token : "<Hidden>" }} <button @click="viewingToken = user._id">View token</button> <button @click="copyToClip(user.token)">Copy to clipboard</button>
    </div>
</template>
