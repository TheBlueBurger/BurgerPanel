<script setup lang="ts">
import { onMounted, ref, Ref, inject, computed } from 'vue';
import { useRouter } from 'vue-router';
import { _ServerPermissions, userHasAccessToServer, hasServerPermission, ServerPermissions, ServerProfiles } from '../../../../Share/Permission';
import { Server } from '../../../../Share/Server';
import { User } from '../../../../Share/User';
import event from '../../util/event';
import getServerByID from '../../util/getServerByID';
import { getUser } from '../../util/getUsers';

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
onMounted(async () => {
    try {
        server.value = await getServerByID(null, props.server);
        user.value = await getUser(props.user, cachedUsers.value);
    } catch(err) {
        alert((err as any).toString());
        console.log(err);
        router.push({
            name: "editServer",
            params: {
                server: props.server
            }
        });
    }
    if(!userHasAccessToServer(user.value, server.value)) {
        alert("This user does not have access to this server! Nothing here will work");
    }
});
let userInAllowedUsers = computed(() => {
    return server.value.allowedUsers.find(au => au.user == props.user);
});
async function togglePerm(perm: ServerPermissions) {
    event.emit("sendPacket", {
        type: "setServerOption",
        id: props.server,
        allowedUsers: {
            action: "changePerm",
            value: !userInAllowedUsers.value?.permissions.includes(perm),
            permission: perm,
            user: props.user
        }
    });
    let resp = await event.awaitEvent("setServerOption-" + props.server);
    if(!resp.success) {
        alert(resp.message);
    } else {
        server.value = await getServerByID(null, props.server);
    }
}
async function applyProfile(profile: string) {
    if(isApplied(profile)) return;
    event.emit("sendPacket", {
        type: "setServerOption",
        id: props.server,
        allowedUsers: {
            action: "applyProfile",
            profile,
            user: props.user
        }
    });
    let resp = await event.awaitEvent("setServerOption-" + props.server);
    if(!resp.success) {
        alert(resp.message);
    } else {
        server.value = await getServerByID(null, props.server);
    }
}
function isApplied(profile: string) {
    return !_ServerPermissions.some(p => {
        if(ServerProfiles[profile].includes(p)) return !userInAllowedUsers.value?.permissions.includes(p);
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
            name: 'manageUser',
            params: {
                user: props.user
            }
        }"><button>Manage user</button></RouterLink>
        <br/>
        <h2>Profiles</h2>
        <div v-for="profile in Object.keys(ServerProfiles)">
            {{ profile }} <button @click="applyProfile(profile)" :class="
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