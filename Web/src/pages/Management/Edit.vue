<script setup lang="ts">
import { Ref, inject, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Server } from '../../../../Share/Server';
import { User } from '../../../../Share/User';
import events from '../../util/event';
import getServerByID from '../../util/getServerByID';
let server = ref<Server | null>(null);
let props = defineProps<{
  server: string;
}>();
let router = useRouter();
let loginStatus = inject("loginStatus") as Ref<User | null>
let users: Ref<User[]> = inject("users") as Ref<User[]>;
onMounted(async () => {
    try {
        server.value = await getServerByID(null, props.server);
        ourAllowedUsers.value = server.value?.allowedUsers || [];
        if(ourAllowedUsers.value.length == 0) {
            events.emit("createNotification", "This server has no allowed users. This should never happen. You should add a user.");
        }
    } catch(err) {
        alert("Failed to get server details. " + (err as any)?.message || "No error message provided.");
        router.push("/manage");
    }
    if(!loginStatus.value?.admin) {
        events.emit("createNotification", "You are not an admin. You will not be able to change some settings.");
    } else {
        getUserlist();
    }
});
async function renameServer() {
    let newName = prompt("Enter a new name for this server", server.value?.name);
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
async function changeMemory() {
    let newMem = prompt("Enter new ram limit for server", server.value?.mem.toString());
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
async function changeVersion() {
    let newVersion = prompt("Enter new version for server", server.value?.version);
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
async function changeSoftware() {
    let newSoftware = prompt("Enter new software for server", server.value?.software);
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
async function changePort() {
    let newPort = prompt("Enter new port for server", server.value?.port.toString());
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
function gotoConsole() {
    router.push({
        name: "manageServer",
        params: {
            server: props.server
        }
    })
}
let ourAllowedUsers = ref<string[]>([]);
function removeUser(user: string) {
    if(ourAllowedUsers.value.length == 1) return events.emit("createNotification", "You cannot remove the last user from a server. Please add another user first.");
    if(!confirm("Are you sure you want to remove this user?")) return;
    ourAllowedUsers.value = ourAllowedUsers.value.filter(u => u != user);
}
function addUser() {
    let newUserID: string | null | undefined = prompt("Enter the ID or username of the user you want to add.");
    if(newUserID) {
        if(ourAllowedUsers.value.includes(newUserID)) return events.emit("createNotification", "This user is already allowed to access this server.");
        if(newUserID.match(/^[a-fA-F0-9]{24}$/)) {
            if(!users.value.find(u => u._id == newUserID)) return events.emit("createNotification", "User with that ID not found.");
        } else {
            newUserID = users.value.find(u => u.username.toLowerCase() == newUserID?.toLowerCase())?._id;
            if(!newUserID) return events.emit("createNotification", "User with that username not found.");
        }
        ourAllowedUsers.value.push(newUserID);
    }
}
async function saveAllowedUsers() {
    events.emit("sendPacket", {
        type: "setServerOption",
        id: props.server,
        allowedUsers: ourAllowedUsers.value
    });
    let resp = await events.awaitEvent("setServerOption-" + props.server);
    if(resp?.success) {
        events.emit("createNotification", `Allowed users changed`);
        server.value = await getServerByID(null, props.server);
    } else {
        alert("Failed to change allowed users: " + resp.message);
    }
}
async function getUserlist() {
    events.emit("sendPacket", { type: "getUsers" });
    let serverProvidedUserList = await events.awaitEvent("getUsers");
    if (!serverProvidedUserList?.success) {
        alert("Failed to get user list: " + serverProvidedUserList?.message);
        return;
    }
    if (serverProvidedUserList?.userList) {
        users.value = serverProvidedUserList.userList;
    }
}
function getUserInfo(id: string) {
    return users.value.find(u => u._id == id);
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
</script>

<template>
<div v-if="server">
    <h2>Editing {{ server.name }}</h2>
    <button @click="deleteServer()">Delete</button>
    <button @click="gotoConsole">Go to console</button> <br/><hr/>
    Server name: {{ server.name }} <button @click="renameServer">Rename</button>
    <br />
    Server path: {{ server.path }} (Read only)
    <br />
    Memory: {{ server.mem }} MB <button @click="changeMemory">Change</button>
    <br />
    Version: {{ server.version }} <button @click="changeVersion">Change</button>
    <br />
    Software: {{ server.software }} <button @click="changeSoftware">Change</button>
    <br />
    Port: {{ server.port }} <button @click="changePort">Change</button>
    <br />
    Auto start: {{ server.autoStart ? "Yes" : "No" }} <button @click="changeAutoStart">Change</button>
    <div v-if="loginStatus?.admin">
        <hr />
        <h3>Allowed users</h3>
        <button @click="addUser">Add user</button>
        <button v-if="loginStatus.admin && !ourAllowedUsers.includes(loginStatus._id)" @click="loginStatus?._id ? ourAllowedUsers.push(loginStatus?._id) : 0">Add yourself</button>
        <br/>
        <div v-for="user in ourAllowedUsers" :key="user">
            {{ getUserInfo(user)?.username || "<Unknown>" }} {{ getUserInfo(user)?.admin ? "(Admin)" : "(User)" }} [{{ user }}] <button @click="removeUser(user)">Remove</button>
        </div>
        <button @click="saveAllowedUsers">Save Userlist</button>
    </div>
</div>
<div v-else>
    Loading server data...
</div>
</template>