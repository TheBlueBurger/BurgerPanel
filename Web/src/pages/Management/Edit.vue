<script setup lang="ts">
import { Ref, inject, ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { hasPermission, hasServerPermission, userHasAccessToServer } from '../../../../Share/Permission';
import { Server, ServerStatuses } from '../../../../Share/Server';
import { User } from '../../../../Share/User';
import events from '../../util/event';
import getUsers from '../../util/getUsers';
import TextInput from '../../components/TextInput.vue';
import sendRequest from '../../util/request';
import titleManager from '../../util/titleManager';
import { confirmModal, modalInput, requestModal, showInfoBox } from '../../util/modal';
import Modal from '../../components/Modal.vue';
import { useUser } from '../../stores/user';
import { useServers } from '../../stores/servers';
let server = ref<Server | null>(null);
let props = defineProps<{
  server: string;
}>();
let router = useRouter();
const user = useUser();
let users = inject("users") as Ref<Map<string, User>>;
let serverStatuses = inject("statuses") as Ref<ServerStatuses>;
let thisServerStatus = computed(() => {
    return serverStatuses.value[props.server]?.status;
});
let isRunning = computed(() => thisServerStatus.value == "running");
let servers = useServers();
try {
    server.value = await servers.getServerByID(props.server);
} catch(err) {
    showInfoBox("Couldn't get server", `${err}`);
    router.push("/manage");
}
if(!user.hasPermission("users.view")) {
    events.emit("createNotification", "You do not have user view permissions. User management has been disabled.");
} else {
    await getUserlist();
}
titleManager.setTitle("Editing " + server.value?.name)
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
    if(!await confirmModal("Remove access?", `Are you sure you want to remove ${user} from the server?`)) return;
    let resp = await sendRequest("setServerOption", {
        id: props.server,
        allowedUsers: {
            action: "remove",
            user: user
        }
    });
    server.value = resp.server;
}
let showAddUserModal = ref(false);
async function addUser() {
    showAddUserModal.value = true;
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

let notAddedUsers = computed(() => {
    return [...users.value.values()].filter(u => !server.value?.allowedUsers.some(a => a.user == u._id));
})

async function deleteServer() {
    if((await requestModal({
        title: `Delete '${server.value?.name}'?`,
        description: `Are you sure you want to delete '${server.value?.name}'?\n `,
        confirmButtonType: "CONFIRM",
        grayNo: true,
        reversedButtonColors: true,
        whiteLabels: true
    })).type == "YES") {
        await sendRequest("deleteServer", {
            id: props.server
        });
        await showInfoBox(`Server '${server.value?.name}' deleted.`, "For security reasons, you will need to delete the server folder manually.\nThe folder is located at " + server.value?.path + ".");
        router.push("/manage");
    }
}

async function changeAutoStart() {
    server.value = (await sendRequest("setServerOption", {
        id: props.server,
        autoStart: !server.value?.autoStart
    })).server;
    events.emit("createNotification", `Server auto start ${server.value.autoStart ? "enabled" : "disabled"}`);
}
async function changeAutoRestart() {
    server.value = (await sendRequest("setServerOption", {
        id: props.server,
        autoRestart: !server.value?.autoRestart
    })).server;
    events.emit("createNotification", `Server auto restart ${server.value.autoRestart ? "enabled" : "disabled"}`);
}
</script>

<template>
<div v-if="server">
    <h2>Editing {{ server.name }}</h2>
    <button @click="deleteServer()" v-if="user.hasServerPermission(server, 'delete')" class="button-red">Delete</button>
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
    Server name: <TextInput :default="server.name" @set="renameServer" :force-disabled="!user.hasServerPermission(server, 'set.name')" />
    <br />
    Server path: {{ server.path }} (Read only)
    <br />
    Memory (MB): <TextInput :default="server.mem.toString()" @set="changeMemory" :force-disabled="!user.hasServerPermission(server, 'set.mem')" />
    <br />
    Version: <TextInput :default="server.version" @set="changeVersion" :force-disabled="!user.hasServerPermission(server, 'set.version') || isRunning" /> <span class="red-text" v-if="isRunning">Server is running!</span>
    <br />
    Software: <TextInput :default="server.software" @set="changeSoftware" :force-disabled="!user.hasServerPermission(server, 'set.software') || isRunning" /> <span class="red-text" v-if="isRunning">Server is running!</span>
    <br />
    Port: <TextInput :default="server.port.toString()" @set="changePort" :force-disabled="!user.hasServerPermission(server, 'set.port') || isRunning" /> <span class="red-text" v-if="isRunning">Server is running!</span>
    <br />
    Auto start: {{ server.autoStart ? "Yes" : "No" }} <button @click="changeAutoStart" :disabled="!user.hasServerPermission(server, 'set.autostart')">Change</button>
    <br />
    Auto restart: {{ server.autoRestart ? "Yes" : "No" }} <button @click="changeAutoRestart" :disabled="!user.hasServerPermission(server, 'set.autorestart')">Change</button>
    <div v-if="user.hasPermission('users.view')">
        <hr />
        <h3>Allowed users</h3>
        <button @click="addUser" v-if="user.hasServerPermission(server, 'set.allowedUsers.add')">Add user</button>
        <button v-if="!server.allowedUsers.find(u => u.user == user.user?._id) && user.hasPermission('server.all.set.allowedUsers.add')" @click="user.user?._id ? addUserByID(user.user._id) : 0">Add yourself</button>
        <br/>
        <div v-for="_user in server.allowedUsers" :key="_user.user">
            {{ getUserInfo(_user.user)?.username || "<Unknown>" }} [{{ _user.permissions.join(", ") }}] <button @click="removeUser(_user.user)" v-if="user.hasServerPermission(server, 'set.allowedUsers.remove')">Remove</button> <RouterLink :to="{
                name: 'editServerAccess',
                params: {
                    server: props.server,
                    user: _user.user
                }
            }"><button>Edit</button></RouterLink>
        </div>
        <Modal v-if="showAddUserModal" button-type="" :white-buttons="false" @close-btn-clicked="showAddUserModal = false">
            <h1>Add user</h1>
            <br/>
            <p>Choose all users you want to add</p>
            <br/>
            <div v-for="user of notAddedUsers" v-if="notAddedUsers.length != 0">
                <button :disabled="server.allowedUsers.some(a => a.user == user._id)" @click="addUserByID(user._id)">{{ user.username }}</button> <i v-if="hasPermission(user, 'servers.all.view')">(Can view all servers)</i>
            </div>
            <div v-else>
                There are no users without access
            </div>
            <br/>
            <button @click="showAddUserModal = false">Close</button>
        </Modal>
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
.red-text {
    color: #b13737;
}
</style>