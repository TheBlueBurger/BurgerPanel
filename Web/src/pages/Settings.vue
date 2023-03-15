<script setup lang="ts">
import { inject, Ref, ref } from "vue";
import { Config, defaultConfig, descriptions } from "../../../Share/Config.js";
import { User } from "../../../Share/User.js";
import { setSetting, getAllSettings } from "../util/config";
import EventEmitter from "../util/event";
import { useRouter } from "vue-router";
let router = useRouter();
let loginStatus = inject("loginStatus") as Ref<User>;
let events: Ref<typeof EventEmitter> = inject("events") as Ref<typeof EventEmitter>;
if(!loginStatus.value?.admin) {
    events.value.emit("createNotification", "You are not an admin! Get out of here!");
    router.push({
        path: "/"
    });
}
let knownSettings = inject("knownSettings") as Ref<{ [key in keyof Config]: any }>;
async function changeOption(option: keyof typeof defaultConfig) {
    let newValue = prompt("New value for " + option + "\n" + descriptions[option], knownSettings.value[option] ?? "");
    try {
        await setSetting(option, newValue);
        knownSettings.value[option] = newValue; // I KNOW THIS ISNT NEEDED BUT THIS IS BEING STUPID
        events.value.emit("createNotification", "Successfully changed option")
    } catch (e) {
        alert("Failed to set option: " + e);
    }
}
getAllSettings();
async function getUserlist() {
    events.value.emit("sendPacket", { type: "getUsers" });
    let serverProvidedUserList = await events.value.awaitEvent("getUsers");
    if (!serverProvidedUserList?.success) {
        alert("Failed to get user list: " + serverProvidedUserList?.message);
        return;
    }
    if (serverProvidedUserList?.userList) {
        users.value = serverProvidedUserList.userList;
    }
}
async function toggleAdmin(user: User) {
    events.value.emit("sendPacket", {
        type: "toggleAdmin",
        id: user._id
    })
    let resp = await events.value.awaitEvent("toggleadmin-" + user._id);
    if (resp?.success) {
        events.value.emit("createNotification", "User " + user.username + " is now " + (resp.user.admin ? "an admin" : "not an admin"));
        // Set the user to the new user
        users.value.find(u => u._id == user._id)!.admin = resp.user.admin;
    } else {
        alert("Failed to toggle admin: " + resp.message);
    }
}

let creatingUser = ref(false);
let newUsername = ref("");
let newAdmin = ref(false);
let users: Ref<User[]> = inject("users") as Ref<User[]>;
async function createUser() {
    events.value.emit("sendPacket", {
        type: "createUser",
        username: newUsername.value,
        admin: newAdmin.value
    });
    newUsername.value = "";
    newAdmin.value = false;
    creatingUser.value = false;
    let resp = await events.value.awaitEvent("createUser");
    if (resp?.success) {
        events.value.emit("createNotification", "User " + resp.user.username + " created");
        getUserlist();
    } else {
        events.value.emit("createNotification", "Failed to create user: " + resp.message);
    }
}
async function deleteUser(user: User) {
    if (confirm("Are you sure you want to delete this user?")) {
        await events.value.emit("sendPacket", {
            type: "deleteUser",
            id: user._id
        });
        let resp = await events.value.awaitEvent("deleteUser");
        if (resp?.success) {
            events.value.emit("createNotification", "User " + user.username + " deleted");
            getUserlist();
        } else {
            alert("Failed to delete user: " + resp.message);
        }
    }
}
getUserlist();
let viewingToken = ref("");
function copyToClip(text: string) {
    navigator.clipboard.writeText(text);
    events.value.emit("createNotification", "Copied to clipboard");
}
function showHelpForSetting(setting: string) {
    alert("Help for " + setting + ":\n" + descriptions[setting as keyof typeof defaultConfig]);
}
</script>
<template>
    <h2>Settings</h2>
    <!-- Do not touch this mess -->
    <div v-for="option of Object.keys(defaultConfig)">
        <span class="setting-span" @click="showHelpForSetting(option)">{{ option }}</span>{{ typeof knownSettings[option as keyof typeof defaultConfig] != "undefined" ? ": "
        + (knownSettings[option as keyof typeof defaultConfig] === "" ? "<Empty string> " : knownSettings[option as keyof typeof defaultConfig]) : ": <Unknown>" }}
        <button @click="() => changeOption(option as keyof typeof defaultConfig)">Edit</button>
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
    <div v-for="user of users">
        <hr>
        ID: {{ user._id }} <button @click="deleteUser(user)">Delete</button>
        <br>
        Username: {{ user.username }}
        <br>
        Admin: {{ user.admin ? "Yes" : "No" }} <button @click="toggleAdmin(user)">Toggle admin status</button>
        <br>
        Created at: {{ new Date(user.createdAt).toLocaleString() }}
        <br>
        Token: {{ viewingToken == user._id ? user.token : "<Hidden>" }} <button @click="viewingToken = user._id">View
                token</button> <button @click="copyToClip(user.token)">Copy to clipboard</button>
    </div>
</template>
<style>
.setting-span {
    cursor: help;
}
</style>
