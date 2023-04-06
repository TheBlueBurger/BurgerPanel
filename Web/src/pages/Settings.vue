<script setup lang="ts">
import { computed, inject, Ref, ref } from "vue";
import { Config, defaultConfig, descriptions, disabledEditingFrontend } from "../../../Share/Config.js";
import { User } from "../../../Share/User.js";
import { setSetting, getAllSettings } from "../util/config";
import EventEmitter from "../util/event";
import { useRouter } from "vue-router";
import { hasPermission } from "../../../Share/Permission";
import getUsers from "../util/getUsers";
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
        let val = await setSetting(option, newValue);
        knownSettings.value = await getAllSettings(); // i cant bother with this breaking
        events.value.emit("createNotification", "Successfully changed option")
    } catch (e) {
        alert("Failed to set option: " + e);
    }
}
getAllSettings();
let cachedUsers = inject("users") as Ref<Map<string, User>>

let creatingUser = ref(false);
let newUsername = ref("");
async function createUser() {
    events.value.emit("sendPacket", {
        type: "createUser",
        username: newUsername.value
    });
    newUsername.value = "";
    creatingUser.value = false;
    let resp = await events.value.awaitEvent("createUser");
    if (resp?.success) {
        events.value.emit("createNotification", "User " + resp.user.username + " created");
        getUsers(cachedUsers.value, true);
    } else {
        events.value.emit("createNotification", "Failed to create user: " + resp.message);
    }
}
getUsers(cachedUsers.value, true);
function showHelpForSetting(setting: string) {
    alert("Help for " + setting + ":\n" + descriptions[setting as keyof typeof defaultConfig]);
}
async function deleteUser(user: User) {
    if(!confirm("Are you sure you want to remove the user" + user.username + "?")) return;
    events.value.emit("sendPacket", {
        type: "deleteUser",
        id: user._id
    });
    let resp = await events.value.awaitEvent("deleteUser");
    if(!resp.success) {
        alert(resp.message);
    } else {
        events.value.emit("createNotification", "Successfully deleted user");
        getUsers(cachedUsers.value, true);
    }
}

let knownTokens: Ref<{[id: string]: string}> = ref({});
let viewingToken = ref("");
async function viewToken(userID: string, copy: boolean = false) {
    if (viewingToken.value == userID) {
        viewingToken.value = "";
        return;
    }
    if (knownTokens.value[userID] && !copy) viewingToken.value == userID ? "" : userID;
    await events.value.emit("sendPacket", {
        type: "getUserToken",
        id: userID
    });
    let resp = await events.value.awaitEvent("getUserToken-" + userID);
    if (resp?.success) {
        knownTokens.value[userID] = resp.token;
        if (!copy) viewingToken.value = userID;
        else copyToClip(resp?.token);
    } else {
        alert("Failed to get user token: " + resp.message);
    }
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
</script>
<template>
    <div v-if="hasPermission(loginStatus, 'settings.read')">
        <h2>Settings</h2>
        <!-- Do not touch this mess -->
        <div v-for="option of settingsAllowedToShow">
            <span class="setting-span" @click="showHelpForSetting(option)">{{ option }}</span>{{ typeof knownSettings[option as
            keyof typeof defaultConfig] != "undefined" ? ": "
            + (knownSettings[option as keyof typeof defaultConfig] === "" ? "<Empty string> " : knownSettings[option as keyof
                typeof defaultConfig]) : ": <Unknown>" }}
                <button @click="() => changeOption(option as keyof typeof defaultConfig)">Edit</button>
        </div>
    </div>
    <div v-if="hasPermission(loginStatus, 'settings.logging.set')">
        <RouterLink :to="{
            name: 'logging'
        }"><button>Logging Settings</button></RouterLink>
    </div>
    <hr v-if="hasPermission(loginStatus, 'users.view')" />
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
            <th v-if="hasPermission(loginStatus, 'users.delete')">Delete</th>
        </tr>
        <tr v-for="user in sortedUsers" :key="user._id">
            <td>{{ user._id }}</td>
                <td>{{ user.username }}</td>
                <td>{{ new Date(user.createdAt).toLocaleString() }}</td>
                <td>
                    {{ viewingToken == user._id ? knownTokens[user._id] : "<Hidden>" }} <button @click="viewToken(user._id)">{{viewingToken == user._id ? "Hide" : "View" }}
                token</button> <button @click="viewToken(user._id, true)">Copy to clipboard</button>
                </td>
                <td><RouterLink :to="{
                name: 'editUserPermissions',
                params: {
                    user: user._id
                }
            }"><button>Edit permissions</button></RouterLink></td>
            <td>
                <button @click="deleteUser(user)" v-if="hasPermission(loginStatus, 'users.delete')">Delete</button>
            </td>
        </tr>
    </table>
</template>
<style>
.setting-span {
    cursor: help;
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
