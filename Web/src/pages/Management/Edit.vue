<script setup lang="ts">
import { Ref, inject, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { hasPermission, hasServerPermission } from '../../../../Share/Permission';
import { Server, ServerStatuses } from '../../../../Share/Server';
import { User } from '../../../../Share/User';
import events from '../../util/event';
import getServerByID from '../../util/getServerByID';
import getUsers from '../../util/getUsers';
import TextInput from '../../components/TextInput.vue';
import sendRequest from '../../util/request';
let server = ref<Server | null>(null);
let props = defineProps<{
  server: string;
}>();
let router = useRouter();
let loginStatus = inject("loginStatus") as Ref<User | null>
let users = inject("users") as Ref<Map<string, User>>;
let serverStatuses = inject("statuses") as Ref<ServerStatuses>;
onMounted(async () => {
    try {
        server.value = await getServerByID(null, props.server);
    } catch(err) {
        alert("Failed to get server details. " + (err as any)?.message || "No error message provided.");
        router.push("/manage");
    }
    if(!hasPermission(loginStatus.value, "users.view")) {
        events.emit("createNotification", "You do not have user view permissions. User management has been disabled.");
    } else {
        getUserlist();
    }
});
async function renameServer(newName: string) {
    if(newName) {
        server.value = (await sendRequest("setServerOption", {id: props.server, name: newName})).server;
        events.emit("createNotification", `Server name changed to '${newName}'`)
    }
}
async function changeMemory(newMem: string) {
    if(newMem && !isNaN(parseInt(newMem))) {
        server.value = (await sendRequest("setServerOption", {id: props.server, mem: parseInt(newMem)})).server;
        events.emit("createNotification", `Server name changed to '${newMem}'`)
    }
}
async function changeVersion(newVersion: string) {
    if(newVersion) {
        server.value = (await sendRequest("setServerOption", {id: props.server, version: newVersion})).server;
        events.emit("createNotification", `Server version changed to '${newVersion}'`)
    }
}
async function changeSoftware(newSoftware: string) {
    if(newSoftware) {
        server.value = (await sendRequest("setServerOption", {id: props.server, version: newSoftware})).server;
        events.emit("createNotification", `Server software changed to '${newSoftware}'`)
    }
}
async function changePort(newPort: string) {
    if(newPort) {
        server.value = (await sendRequest("setServerOption", {id: props.server, port: newPort})).server;
        events.emit("createNotification", `Server port changed to '${newPort}'`)
    }
}
async function removeUser(user: string) {
    if(server?.value?.allowedUsers?.length == 1) return events.emit("createNotification", "You cannot remove the last user from a server. Please add another user first.");
    if(!confirm("Are you sure you want to remove this user from the server?")) return;
    let resp = await sendRequest("setServerOption", {
        id: props.server,
        allowedUsers: {
            action: "remove",
            user: user
        }
    });
    server.value = resp.server;
}
async function addUser() {
    let newUserID: string | null | undefined = prompt("Enter the ID or username of the user you want to add.");
    if(newUserID) {
        if(newUserID.match(/^[a-fA-F0-9]{24}$/)) {
            if(!users.value.get(newUserID)) return events.emit("createNotification", "User with that ID not found.");
        } else {
            newUserID = [...users.value.values()].find(u => u.username.toLowerCase() == newUserID?.toLowerCase())?._id
            if(!newUserID) return events.emit("createNotification", "User with that username not found.");
        }
        if(server.value?.allowedUsers.find(u => u.user == newUserID)) return events.emit("createNotification", "This user is already allowed to access this server.");
    }
    if(!newUserID) return;
    await addUserByID(newUserID);
}

async function addUserByID(id: string) {
    let resp = await sendRequest("setServerOption", {
        id: props.server,
        allowedUsers: {
            action: "add",
            user: id
        }
    })
    server.value = resp.server;
}

async function getUserlist() {
    return [...((await getUsers(users.value, false)).values())];
}

function getUserInfo(id: string) {
    return users.value.get(id);
}

async function deleteServer() {
  if (prompt("Are you sure you want to delete this server and ALL files? This cannot be undone. Type 'DELETE' to delete.") == "DELETE") {
    await sendRequest("deleteServer", {
        id: props.server
    });
    alert("Server deleted. For security reasons, you will need to delete the server folder manually. The folder is located at " + server.value?.path + ".");
    router.push("/manage");
  }
}

async function changeAutoStart() {
    server.value = (await sendRequest("setServerOption", {
        id: props.server,
        autoStart: !server.value?.autoStart
    })).server;
    events.emit("createNotification", `Server auto start ${server.value.autoStart ? "enabled" : "disabled"}'`);
}
async function changeAutoRestart() {
    server.value = (await sendRequest("setServerOption", {
        id: props.server,
        autoRestart: !server.value?.autoRestart
    })).server;
    events.emit("createNotification", `Server auto restart ${server.value.autoRestart ? "enabled" : "disabled"}'`);
}
</script>

<template>
<div v-if="server">
    <h2>Editing {{ server.name }}</h2>
    <button @click="deleteServer()" v-if="hasServerPermission(loginStatus, server, 'delete')" class="button-red">Delete</button>
    <RouterLink :to="{
        name: 'manageServer',
        params: {
            server: props.server
        }
    }"><button>Go to console</button></RouterLink>
    <RouterLink :to="{
        name: 'viewLogs',
        params: {
            server: props.server
        }
    }"><button>View logs</button></RouterLink>
    <RouterLink :to="{
        name: 'serverFiles',
        params: {
            server: props.server
        }
    }">
        <button>Edit Files</button>
    </RouterLink><br/><hr/>
    Server name: <TextInput :default="server.name" @set="renameServer" :force-disabled="!hasServerPermission(loginStatus, server, 'set.name')" />
    <br />
    Server path: {{ server.path }} (Read only)
    <br />
    Memory (MB): <TextInput :default="server.mem.toString()" @set="changeMemory" :force-disabled="!hasServerPermission(loginStatus, server, 'set.mem')" />
    <br />
    Version: <TextInput :default="server.version" @set="changeVersion" :force-disabled="!hasServerPermission(loginStatus, server, 'set.version')" />
    <br />
    Software: <TextInput :default="server.software" @set="changeSoftware" :force-disabled="!hasServerPermission(loginStatus, server, 'set.software')" />
    <br />
    Port: <TextInput :default="server.port.toString()" @set="changePort" :force-disabled="!hasServerPermission(loginStatus, server, 'set.port')" />
    <br />
    Auto start: {{ server.autoStart ? "Yes" : "No" }} <button @click="changeAutoStart" :disabled="!hasServerPermission(loginStatus, server, 'set.autostart')">Change</button>
    <br />
    Auto restart: {{ server.autoRestart ? "Yes" : "No" }} <button @click="changeAutoRestart" :disabled="!hasServerPermission(loginStatus, server, 'set.autorestart')">Change</button>
    <div v-if="hasPermission(loginStatus, 'users.view')">
        <hr />
        <h3>Allowed users</h3>
        <button @click="addUser" v-if="hasServerPermission(loginStatus, server, 'set.allowedUsers.add')">Add user</button>
        <button v-if="!server.allowedUsers.find(u => u.user == loginStatus?._id) && hasPermission(loginStatus, 'server.all.set.allowedUsers.add')" @click="loginStatus?._id ? addUserByID(loginStatus._id) : 0">Add yourself</button>
        <br/>
        <div v-for="user in server.allowedUsers" :key="user.user">
            {{ getUserInfo(user.user)?.username || "<Unknown>" }} [{{ user.permissions.join(", ") }}] <button @click="removeUser(user.user)" v-if="hasServerPermission(loginStatus, server, 'set.allowedUsers.remove')">Remove</button> <RouterLink :to="{
                name: 'editServerAccess',
                params: {
                    server: props.server,
                    user: user.user
                }
            }"><button>Edit</button></RouterLink>
        </div>
    </div>
</div>
<div v-else>
    Loading server data...
</div>
</template>
<style scoped>
.button-red {
    background-color: #b13737;
}
</style>