<script setup lang="ts">
import { inject, Ref, ref } from "vue";
import { Config, defaultConfig, descriptions } from "../../../Share/Config.js";
import { User } from "../../../Share/User.js";
import { setSetting, getAllSettings } from "../util/config";
import EventEmitter from "../util/event";
import { useRouter } from "vue-router";
import { hasPermission } from "../../../Share/Permission";
let router = useRouter();
let loginStatus = inject("loginStatus") as Ref<User>;
let events: Ref<typeof EventEmitter> = inject("events") as Ref<typeof EventEmitter>;
if (!hasPermission(loginStatus.value, "settings.read") && !hasPermission(loginStatus.value, "users.view")) {
    events.value.emit("createNotification", "You do not have permission! Get out of here!");
    router.push({
        path: "/"
    });
}
let knownSettings = inject("knownSettings") as Ref<{ [key in keyof Config]: any }>;
async function changeOption(option: keyof typeof defaultConfig) {
    let newValue = prompt("New value for " + option + "\n" + descriptions[option], knownSettings.value[option] ?? "");
    try {
        if (!newValue) return;
        await setSetting(option, newValue);
        knownSettings.value[option] = newValue; // I KNOW THIS ISNT NEEDED BUT THIS IS BEING STUPID
        events.value.emit("createNotification", "Successfully changed option")
    } catch (e) {
        alert("Failed to set option: " + e);
    }
}
getAllSettings();
let cachedUsers = inject("users") as Ref<Map<string, User>>
async function getUserlist() {
    events.value.emit("sendPacket", { type: "getUsers" });
    let serverProvidedUserList = await events.value.awaitEvent("getUsers");
    if (!serverProvidedUserList?.success) {
        alert("Failed to get user list: " + serverProvidedUserList?.message);
        return;
    }
    if (serverProvidedUserList?.userList) {
        serverProvidedUserList.userList.forEach((user: User) => {
            cachedUsers.value.set(user._id, user);
        });
        // legal? lets make a util function for this that gets user list and caches go in util folder
    }
}

let creatingUser = ref(false);
let newUsername = ref("");
let newAdmin = ref(false);
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
getUserlist();
function showHelpForSetting(setting: string) {
    alert("Help for " + setting + ":\n" + descriptions[setting as keyof typeof defaultConfig]);
}
</script>
<template>
    <div v-if="hasPermission(loginStatus, 'settings.read')">
        <h2>Settings</h2>
        <!-- Do not touch this mess -->
        <div v-for="option of Object.keys(defaultConfig)">
            <span class="setting-span" @click="showHelpForSetting(option)">{{ option }}</span>{{ typeof knownSettings[option as
            keyof typeof defaultConfig] != "undefined" ? ": "
            + (knownSettings[option as keyof typeof defaultConfig] === "" ? "<Empty string> " : knownSettings[option as keyof
                typeof defaultConfig]) : ": <Unknown>" }}
                <button @click="() => changeOption(option as keyof typeof defaultConfig)">Edit</button>
        </div>
        <hr v-if="hasPermission(loginStatus, 'users.view')" />
    </div>
    <h3>Users</h3>
    <div v-if="cachedUsers.size == 0">
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
    <div v-for="user of cachedUsers.values()">
        {{ user.username}} <RouterLink :to="{name: 'manageUser', params: {user: user._id}}"><button>ig manage</button></RouterLink>
    </div>
</template>
<style>
.setting-span {
    cursor: help;
}
</style>
