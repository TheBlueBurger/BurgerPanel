<script setup lang="ts">
import { inject, Ref, onMounted, ref } from 'vue';
import { User } from '../../../../Share/User';
import { getUser } from '../../util/getUsers';
import { hasPermission, PermissionString, validPermissions } from "../../../../Share/Permission";
import events from '../../util/event';
import { useRouter } from 'vue-router';

let loginStatus = inject("loginStatus") as Ref<User>;

let cachedUsers = inject("users") as Ref<Map<string, User>>;
let user = ref() as Ref<User>;
let props = defineProps({
    user: {
        required: true,
        type: String
    }
});

onMounted(async () => {
    user.value = await getUser(props.user, cachedUsers.value);
    
});

async function togglePerm(perm: PermissionString) {
    events.emit("sendPacket", {
        type: "editUser",
        id: props.user,
        action: "setPermission",
        permission: perm,
        value: !user.value.permissions.includes(perm)
    });
    let resp = await events.awaitEvent("editUser-" + props.user);
    if(!resp.success) {
        alert("Error while toggling permission '" + perm + "': " + resp.message);
        return;
    }
    user.value = resp.user;
}
let router = useRouter();
if(!hasPermission(loginStatus.value, "users.permissions.read")) {
    router.push({
        name: "manageUser",
        params: {
            user: props.user
        }
    })
}
</script>

<template>
    <div v-if="user">
        <h1>Manging user permissions of {{ user.username }}</h1>
        <br>
        <div v-for="perm of validPermissions" v-if="hasPermission(loginStatus, 'users.permissions.read')">
            {{ perm }} - <span :class="(user.permissions.includes(perm) ? 'green' : 'red')">{{  user.permissions.includes(perm) ? "Yes" : "No" }}</span> <button v-if="hasPermission(loginStatus, perm) && hasPermission(loginStatus, 'users.permissions.write')" @click="togglePerm(perm)">Toggle</button>
        </div>
    </div>
    <div v-else>
        Loading...
    </div>
</template>
<style>
.red {
    color: red;
}
.green {
    color: green;
}
</style>