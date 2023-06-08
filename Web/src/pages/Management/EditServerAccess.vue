<script setup lang="ts">
import { onMounted, ref, Ref, inject, computed } from 'vue';
import { useRouter } from 'vue-router';
import { _ServerPermissions, userHasAccessToServer, hasServerPermission, ServerPermissions, DefaultServerProfiles, hasPermission, serverProfilesDescriptions } from '../../../../Share/Permission';
import { Server } from '../../../../Share/Server';
import { User } from '../../../../Share/User';
import event from '../../util/event';
import getServerByID from '../../util/getServerByID';
import { getUser } from '../../util/getUsers';
import sendRequest from '../../util/request';
import titleManager from '../../util/titleManager';
import { showInfoBox } from '../../util/modal';

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
let user = ref() as Ref<User>;
let loginStatus = inject("loginStatus") as Ref<User | null>;
let cachedUsers = inject("users") as Ref<Map<string, User>>;
let router = useRouter();
try {
    server.value = await getServerByID(null, props.server);
    user.value = await getUser(props.user, cachedUsers.value);
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
titleManager.setTitle(`${user.value.username} in ${server.value.name}`)
if(!server.value.allowedUsers.some(a => a.user == user.value._id)) {
    showInfoBox("Hm", "This user doesn't have access to this server. Nothing will work");
}
let userInAllowedUsers = computed(() => {
    return server.value.allowedUsers.find(au => au.user == props.user);
});
async function togglePerm(perm: ServerPermissions) {
    server.value = (await sendRequest("setServerOption", {
        id: props.server,
        allowedUsers: {
            action: "changePerm",
            value: !userInAllowedUsers.value?.permissions.includes(perm),
            permission: perm,
            user: props.user
        }
    })).server;
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
}
function isApplied(profile: string) {
    return !_ServerPermissions.some(p => {
        if(DefaultServerProfiles[profile].includes(p)) return !userInAllowedUsers.value?.permissions.includes(p);
        return userInAllowedUsers.value?.permissions.includes(p);
    })
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
        <h1>Managing {{ user.username }} in {{ server.name }}</h1> <RouterLink :to="{
            name: 'editUserPermissions',
            params: {
                user: props.user
            }
        }" v-if="hasPermission(loginStatus, 'users.permissions.read')"><button>Manage global user permissions</button></RouterLink>
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
        <div v-for="perm in _ServerPermissions" v-if="userInAllowedUsers">
            {{ perm }} - <span :class="(userInAllowedUsers.permissions.includes(perm) ? 'green' : 'red')">{{  userInAllowedUsers.permissions.includes(perm) ? "Yes" : "No" }}</span> <button v-if="hasServerPermission(loginStatus, server, perm) && hasServerPermission(loginStatus, server, 'set.allowedUsers.permissions.write')" @click="togglePerm(perm)">Toggle</button>
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