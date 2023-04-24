<script setup lang="ts">
import { Ref, inject, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { hasPermission, hasServerPermission, Permission, ServerPermissions } from '../../../../Share/Permission';
import { Server } from '../../../../Share/Server';
import { User } from '../../../../Share/User';
import events from '../../util/event';
import getServerByID from '../../util/getServerByID';
import getUsers from '../../util/getUsers';
import TextInput from '../../components/TextInput.vue';
let server = ref<Server | null>(null);
let props = defineProps<{
  server: string;
}>();
let router = useRouter();
let loginStatus = inject("loginStatus") as Ref<User | null>
let users = inject("users") as Ref<Map<string, User>>;
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
        events.emit("sendPacket", {
            type: "setServerOption",
            id: props.server,
            name: newName
        });
        let resp = await events.awaitEvent("setServerOption-" + props.server);
        if(resp?.success) {
            events.emit("createNotification", `Server name changed to '${newName}'`);
            server.value = await getServerByID(null, props.server);
        } else {
            alert("Failed to change server name: " + resp.message);
        }
    }
}
async function changeMemory(newMem: string) {
    if(newMem && !isNaN(parseInt(newMem))) {
        events.emit("sendPacket", {
            type: "setServerOption",
            id: props.server,
            mem: parseInt(newMem)
        });
        let resp = await events.awaitEvent("setServerOption-" + props.server);
        if(resp?.success) {
            events.emit("createNotification", `Server memory changed to '${newMem}'`);
            server.value = await getServerByID(null, props.server);
        } else {
            alert("Failed to change server memory: " + resp.message);
        }
    }
}
async function changeVersion(newVersion: string) {
    if(newVersion) {
        events.emit("sendPacket", {
            type: "setServerOption",
            id: props.server,
            version: newVersion
        });
        let resp = await events.awaitEvent("setServerOption-" + props.server);
        if(resp?.success) {
            events.emit("createNotification", `Server version changed to '${newVersion}'`);
            server.value = await getServerByID(null, props.server);
        } else {
            alert("Failed to change server version: " + resp.message);
        }
    }
}
async function changeSoftware(newSoftware: string) {
    if(newSoftware) {
        events.emit("sendPacket", {
            type: "setServerOption",
            id: props.server,
            software: newSoftware
        });
        let resp = await events.awaitEvent("setServerOption-" + props.server);
        if(resp?.success) {
            events.emit("createNotification", `Server software changed to '${newSoftware}'`);
            server.value = await getServerByID(null, props.server);
        } else {
            alert("Failed to change server software: " + resp.message);
        }
    }
}
async function changePort(newPort: string) {
    if(newPort) {
        events.emit("sendPacket", {
            type: "setServerOption",
            id: props.server,
            port: newPort
        });
        let resp = await events.awaitEvent("setServerOption-" + props.server);
        if(resp?.success) {
            events.emit("createNotification", `Server port changed to '${newPort}'`);
            server.value = await getServerByID(null, props.server);
        } else {
            alert("Failed to change server port: " + resp.message);
        }
    }
}
async function removeUser(user: string) {
    if(server?.value?.allowedUsers?.length == 1) return events.emit("createNotification", "You cannot remove the last user from a server. Please add another user first.");
    if(!confirm("Are you sure you want to remove this user from the server?")) return;
    events.emit("sendPacket", {
        type: "setServerOption",
        id: props.server,
        allowedUsers: {
            action: "remove",
            user: user
        }
    });
    let resp = await events.awaitEvent("setServerOption-" + props.server);
    if(!resp.success) events.emit("createNotification", resp.message);
    server.value = await getServerByID(null, props.server);
    console.log(server.value)
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
    events.emit("sendPacket", {
        type: "setServerOption",
        id: props.server,
        allowedUsers: {
            action: "add",
            user: id
        }
    });
    let resp = await events.awaitEvent("setServerOption-" + props.server);
    if(!resp.success) events.emit("createNotification", resp.message);
    server.value = await getServerByID(null, props.server);
}

async function getUserlist() {
    return [...((await getUsers(users.value, false)).values())];
}

function getUserInfo(id: string) {
    return users.value.get(id);
}

async function deleteServer() {
  if (prompt("Are you sure you want to delete this server and ALL files? This cannot be undone. Type 'DELETE' to delete.") == "DELETE") {
    events.emit("sendPacket", {
      type: "deleteServer",
      id: props.server
    });
    let resp = await events.awaitEvent("server-deleted-" + props.server);
    if (resp?.success) {
      alert("Server deleted. For security reasons, you will need to delete the server folder manually. The folder is located at " + server.value?.path + ".");
      events.emit("createNotification", `Server '${server.value?.name}' deleted.`);
      router.push("/manage");
    } else {
      alert("Failed to delete server: " + resp.message);
    }
  }
}

async function changeAutoStart() {
    console.log(server.value?.autoStart);
    events.emit("sendPacket", {
        type: "setServerOption",
        id: props.server,
        autoStart: !server.value?.autoStart
    });
    let resp = await events.awaitEvent("setServerOption-" + props.server);
    if (resp?.success) {
        events.emit("createNotification", `Server auto start changed to '${!server.value?.autoStart}'`);
        server.value = await getServerByID(null, props.server);
    } else {
        alert("Failed to change server auto start: " + resp.message);
    }
}
async function changeAutoRestart() {
    console.log(server.value?.autoStart);
    events.emit("sendPacket", {
        type: "setServerOption",
        id: props.server,
        autoRestart: !server.value?.autoRestart
    });
    let resp = await events.awaitEvent("setServerOption-" + props.server);
    if (resp?.success) {
        events.emit("createNotification", `Server auto restart changed to '${!server.value?.autoRestart}'`);
        server.value = await getServerByID(null, props.server);
    } else {
        alert("Failed to change server auto restart: " + resp.message);
    }
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
    Server name: <TextInput :default="server.name" @set="renameServer" />
    <br />
    Server path: {{ server.path }} (Read only)
    <br />
    Memory (MB): <TextInput :default="server.mem.toString()" @set="changeMemory" />
    <br />
    Version: <TextInput :default="server.version" @set="changeVersion" />
    <br />
    Software: <TextInput :default="server.software" @set="changeSoftware" />
    <br />
    Port: <TextInput :default="server.port.toString()" @set="changePort" />
    <br />
    Auto start: {{ server.autoStart ? "Yes" : "No" }} <button @click="changeAutoStart">Change</button>
    <br />
    Auto restart: {{ server.autoRestart ? "Yes" : "No" }} <button @click="changeAutoRestart">Change</button>
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