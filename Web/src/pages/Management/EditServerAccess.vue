<script setup lang="ts">
import { ref, Ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { _ServerPermissions, ServerPermissions, DefaultServerProfiles, serverProfilesDescriptions, hasServerPermission } from '@share/Permission';
import { Server } from '@share/Server';
import { User } from '@share/User';
import sendRequest from '@util/request';
import titleManager from '@util/titleManager';
import { showInfoBox } from '@util/modal';
import { useUser } from '@stores/user';
import { useServers } from '@stores/servers';
import { useUsers } from '@stores/users';

let props = defineProps({
    server: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    }
});
let server = ref() as Ref<Server>;
let userAccess = ref<{username: string, id: number, permissions: ServerPermissions[]}>();
const myUser = useUser();
let router = useRouter();
let servers = useServers();
async function getUserAccess() {
    userAccess.value = (await sendRequest("getServerAccess", {
                id: props.server,
                uid: props.user
    })).users[0];
}
try {
    await Promise.all([
        (async() => {
            server.value = await servers.getServerByID(props.server);
        })(),
        (async() => {
            await getUserAccess();
        })()
    ])
} catch(err) {
    showInfoBox("Couldnt get server/user", `${err}`)
    console.log(err);
    router.push({
        name: "editServer",
        params: {
            server: props.server
        }
    });
}
titleManager.setTitle(`${userAccess.value?.username} in ${server.value.name}`)

async function togglePerm(perm: ServerPermissions) {
    server.value = (await sendRequest("setServerOption", {
        id: props.server,
        allowedUsers: {
            action: "changePerm",
            value: !userAccess.value?.permissions.includes(perm),
            permission: perm,
            user: props.user
        }
    })).server;
    await getUserAccess();
}
async function applyProfile(profile: string) {
    if(isApplied(profile)) return;
    server.value = (await sendRequest("setServerOption", {
        id: props.server,
        allowedUsers: {
            action: "applyProfile",
            profile,
            user: props.user
        }
    })).server;
    await getUserAccess();
}
function isApplied(profile: string) {
    return !_ServerPermissions.some(p => {
        if(DefaultServerProfiles[profile].includes(p)) return !userAccess.value?.permissions.includes(p);
        return userAccess.value?.permissions.includes(p);
    })
}
function getDisplayedInfoText(permission: ServerPermissions): string | void {
    if(userAccess.value?.permissions.includes(permission)) return;
    if(userAccess.value?.permissions.includes("full")) return " (Has full server permission)";
}

</script>
<template>
    <RouterLink :to="{
        name: 'editServer',
        params: {
            server: props.server
        }
    }"><button>Go back</button></RouterLink>
    <div v-if="server && user">
        <h1>Managing {{ userAccess?.username }} in {{ server.name }}</h1> <RouterLink :to="{
            name: 'editUserPermissions',
            params: {
                user: props.user
            }
        }" v-if="myUser.hasPermission('users.permissions.read')"><button>Manage global user permissions</button></RouterLink>
        <br/>
        <h2>Profiles</h2>
        <div v-for="profile in Object.keys(DefaultServerProfiles)">
            <span :title="serverProfilesDescriptions[profile]" :style="{cursor: 'default'}">{{ profile }}</span> <button @click="applyProfile(profile)" :class="
            {
                applied: isApplied(profile)
            }
            ">{{ isApplied(profile) ? "Applied" : "Apply" }}</button>
        </div>
        <br/>
        <h2>Permissions</h2>
        <div v-for="perm in _ServerPermissions" v-if="userAccess">
            {{ perm }} - <span :class="(userAccess.permissions.includes(perm) ? 'green' : 'red')">{{  userAccess.permissions.includes(perm) ? "Yes" : "No" }}<span class="perm-info-text">{{ getDisplayedInfoText(perm) }}</span></span> <button v-if="myUser.hasServerPermission(server, perm) && myUser.hasServerPermission(server, 'set.allowedUsers.permissions.write')" @click="togglePerm(perm)">Toggle</button>
        </div>
        <div v-else>
            Could not find user in allowedUsers, weird
        </div>
    </div>
    <div v-else>
        Loading...
    </div>
</template>
<style scoped>
.perm-info-text {
    color: #a7a3a3;
}
.red {
    color: red;
}
.green {
    color: green;
}
.applied {
    cursor: not-allowed;
}
</style>