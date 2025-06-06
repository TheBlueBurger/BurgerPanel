
<script setup lang="ts">
import { Ref, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { hasPermission, hasServerPermission, ServerPermissions } from '@share/Permission';
import { Server } from '@share/Server';
import { User } from '@share/User';
import events from '@util/event';
import TextInput from '@components/TextInput.vue';
import TextField from '@components/TextField.vue';
import sendRequest from '@util/request';
import titleManager from '@util/titleManager';
import { confirmModal, requestModal, showInfoBox } from '@util/modal';
import Modal from '@components/Modal.vue';
import { useUser } from '@stores/user';
import { useServers } from '@stores/servers';
import { useUsers } from '@stores/users';
import { RequestResponses } from '@share/Requests';
let server = ref<Server | null>(null);

let props = defineProps<{
  server: string;
}>();
let router = useRouter();
const user = useUser();
const allUsers = ref<User[]>();
let servers = useServers();
let serverStatuses = servers.statuses;
let thisServerStatus = computed(() => {
    return serverStatuses[props.server]?.status;
});
let isRunning = computed(() => thisServerStatus.value == "running" || thisServerStatus.value == "stopping");
let serverAccess: Ref<{username: string, id: number, permissions: ServerPermissions[]}[]> = ref([]);
async function getServerAccess() {
    serverAccess.value = (await sendRequest("getServerAccess", {id: props.server})).users;
}
await Promise.all([
    (async() => {
        if(!user.hasPermission("users.view")) {
            events.emit("createNotification", "You do not have user view permissions. User management has been disabled.");
        } else {
            await Promise.all([(async() => {
                allUsers.value = await useUsers().getAllUsers();
            })(), (async() => {
                await getServerAccess();
            })()])
        }
    })(),
    (async() => {
        try {
            server.value = await servers.getServerByID(props.server);
        } catch(err) {
            showInfoBox("Couldn't get server", `${err}`);
            router.push("/manage");
        }
        return
    })()
])
titleManager.setTitle("Editing " + server.value?.name)
async function renameServer(newName: string) {
    if(newName) {
        server.value = (await sendRequest("setServerOption", {id: props.server, name: newName})).server;
        servers.updateServer(server.value);
        events.emit("createNotification", `Server name changed to '${newName}'`)
    }
}
async function changeMemory(newMem: string) {
    if(newMem && !isNaN(parseInt(newMem))) {
        server.value = (await sendRequest("setServerOption", {id: props.server, mem: parseInt(newMem)})).server;
        servers.updateServer(server.value);
        events.emit("createNotification", `Server memory changed to '${newMem}'`)
    }
}
async function changeJVMArgs(newJVMArgs: string) {
    server.value = (await sendRequest("setServerOption", {id: props.server, jvmArgs: newJVMArgs})).server;
    servers.updateServer(server.value);
    events.emit("createNotification", `Server JVM arguments changed!`)
}
async function changeVersion(newVersion: string) {
    if(newVersion) {
        server.value = (await sendRequest("setServerOption", {id: props.server, version: newVersion})).server;
        events.emit("createNotification", `Server version changed to '${newVersion}'`)
        servers.updateServer(server.value);
    }
}
async function changeSoftware(newSoftware: string) {
    if(newSoftware) {
        server.value = (await sendRequest("setServerOption", {id: props.server, software: newSoftware})).server;
        events.emit("createNotification", `Server software changed to '${newSoftware}'`)
        servers.updateServer(server.value);
    }
}
async function changePort(newPort: string) {
    if(newPort) {
        server.value = (await sendRequest("setServerOption", {id: props.server, port: newPort})).server;
        events.emit("createNotification", `Server port changed to '${newPort}'`)
        servers.updateServer(server.value);
    }
}
async function removeUser(user: {id: number, username: string}) {
    if(serverAccess.value.length == 1) return events.emit("createNotification", "You cannot remove the last user from a server. Please add another user first.");
    if(!await confirmModal("Remove access?", `Are you sure you want to remove ${user.username} from the server?`)) return;
    await sendRequest("setServerOption", {
        id: props.server,
        allowedUsers: {
            action: "remove",
            user: user.id
        }
    });
    await getServerAccess();
}
let showAddUserModal = ref(false);
async function addUser() {
    showAddUserModal.value = true;
}

async function addUserByID(id: number) {
    let resp = await sendRequest("setServerOption", {
        id: props.server,
        allowedUsers: {
            action: "add",
            user: id
        }
    })
    server.value = resp.server;
    await getServerAccess();
}

let notAddedUsers = computed(() => {
    if(!allUsers.value) return [];
    return allUsers.value.filter(u => !serverAccess.value.some(a => a.id == u.id));
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
        if(server.value) servers.removeServerFromCache(server.value.id);
    }
}

async function changeAutoStart() {
    server.value = (await sendRequest("setServerOption", {
        id: props.server,
        autoStart: !server.value?.autostart
    })).server;
    events.emit("createNotification", `Server auto start ${server.value.autostart ? "enabled" : "disabled"}`);
    servers.updateServer(server.value);
}
async function changeAutoRestart() {
    server.value = (await sendRequest("setServerOption", {
        id: props.server,
        autoRestart: !server.value?.autorestart
    })).server;
    events.emit("createNotification", `Server auto restart ${server.value.autorestart ? "enabled" : "disabled"}`);
    servers.updateServer(server.value);
}
</script>

<template>
<div v-if="server" class="editing">
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
    }" v-if="user.hasServerPermission(server, 'oldlogs.read')"><button>View logs</button></RouterLink>
    <RouterLink :to="{
        name: 'serverFiles',
        params: {
            server: props.server
        }
    }" v-if="user.hasServerPermission(server, 'serverfiles.read')">
        <button>Edit Files</button>
    </RouterLink>
    <RouterLink :to="{
        name: 'downloadPlugins',
        params: {
            server: props.server
        }
    }" v-if="user.hasServerPermission(server, 'plugins.download')">
        <button>Download {{server.software == "fabric" ? "mods" : "plugins"}}</button>
    </RouterLink>
    <RouterLink :to="{
        name: 'integrator',
        params: {
            server: props.server
        }
    }"><button>Integrator</button></RouterLink>
    <button @click="servers.togglePin(server)">{{ servers.isPinned(server) ? "Unpin" : "Pin" }}</button>
    <br/><hr/>
    <div class="main-server-settings">
    Server name: <TextInput :default="server.name" @set="renameServer" :force-disabled="!user.hasServerPermission(server, 'set.name')" />
    <br />
    Server path: {{ server.path }} (Read only)
    <br />
    Memory (MB): <TextInput :default="server.memory.toString()" @set="changeMemory" :force-disabled="!user.hasServerPermission(server, 'set.mem')" />
    <br />
    <div class="mempadder"></div>
    JVM Arguments: <TextField :default="server.jvmArgs" @set="changeJVMArgs" :force-disabled="!user.hasServerPermission(server, 'set.jvmArgs')" />
    Version: <TextInput :default="server.version" @set="changeVersion" :force-disabled="!user.hasServerPermission(server, 'set.version') || isRunning" /><span class="red-text" v-if="isRunning">Server is running!</span>
    <br />
    Software: <TextInput :default="server.software" @set="changeSoftware" :force-disabled="!user.hasServerPermission(server, 'set.software') || isRunning" /><span class="red-text" v-if="isRunning">Server is running!</span>
    <br />
    Port: <TextInput :default="server.port.toString()" @set="changePort" :force-disabled="!user.hasServerPermission(server, 'set.port') || isRunning" /><span class="red-text" v-if="isRunning">Server is running!</span>
    <br />
    <div class="auto">
    Auto start: {{ server.autostart ? "Yes" : "No" }} <button @click="changeAutoStart" :disabled="!user.hasServerPermission(server, 'set.autostart')">Change</button>
    <br />
    Auto restart: {{ server.autorestart ? "Yes" : "No" }} <button @click="changeAutoRestart" :disabled="!user.hasServerPermission(server, 'set.autorestart')">Change</button>
    </div></div>
    <div v-if="user.hasPermission('users.view')">
        <hr />
        <h3>Allowed users</h3>
        <button @click="addUser" v-if="user.hasServerPermission(server, 'set.allowedUsers.add')">Add user</button>
        <button v-if="!serverAccess.find(u => u.id == user.user?.id) && user.hasPermission('server.all.set.allowedUsers.add')" @click="user.user?.id ? addUserByID(user.user.id) : 0">Add yourself</button>
        <br/>
        <div v-for="_user in serverAccess" :key="_user.id">
            {{ _user.username }} [{{ _user.permissions.join(", ") }}] <button @click="removeUser(_user)" v-if="user.hasServerPermission(server, 'set.allowedUsers.remove')">Remove</button> <RouterLink :to="{
                name: 'editServerAccess',
                params: {
                    server: props.server,
                    user: _user.id
                }
            }"><button>Edit</button></RouterLink>
        </div>
        <Modal v-if="showAddUserModal" button-type="" :white-buttons="false" @close-btn-clicked="showAddUserModal = false">
            <h1>Add user</h1>
            <br/>
            <p>Choose all users you want to add</p>
            <br/>
            <div v-for="user of notAddedUsers" v-if="notAddedUsers.length != 0">
                <button :disabled="serverAccess.some(a => a.id == user.id)" @click="addUserByID(user.id)">{{ user.username }}</button> <i v-if="hasPermission(user, 'servers.all.view')">(Can view all servers)</i>
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
.main-server-settings {
    margin: 10px;
}

/* this is a huge hack, I will likely be making this better later */
.main-server-settings > * {
    margin: 8px!important;
}

.main-server-settings > .auto {
    margin: 0!important;
}

.auto > * {
    margin: 0!important;
}

.auto > *:nth-child(2) {
    margin-top: 7px!important;
}

.auto > *:nth-child(3) {
    margin-top: 5px!important;
}

.auto > *:nth-child(5) {
    margin-top: 3px!important;
}

.mempadder {
    margin-top: 10px;
}

.button-red {
    background-color: #b1373780;
    border: 1px solid #c05858;
    color: #ff7b7b;
}
.button-red:hover {
    background-color: #b13737;
    border: 1px solid #d77171;
    color: #ffc4c4;
}
.red-text {
    color: #b13737;
    margin: 0!important;
}

.editing {
    padding: 10px;
}

.editing > br {
    margin: 8px;
}

button {
    margin: 4px;
}

hr {
    margin: 10px;
    color: #272729;
}

h2 {
    margin-bottom: 10px;
    margin-top: 5px;
}
</style>
