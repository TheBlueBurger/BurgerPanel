<script setup lang="ts">
import { Ref, ref } from 'vue';
import { User } from '@share/User';
import { PermissionString, validPermissions } from "@share/Permission";
import { useRouter } from 'vue-router';
import sendRequest from '../../util/request';
import titleManager from '../../util/titleManager';
import { useUser } from '../../stores/user';
import { useUsers } from '../../stores/users';

let myUser = useUser();

let user = ref() as Ref<User>;
let props = defineProps({
    user: {
        required: true,
        type: String
    }
});
let users = useUsers();
user.value = await users.getUserByID(props.user);
titleManager.setTitle(`${user.value.username}'s permissions`);

async function togglePerm(perm: PermissionString) {
    user.value = (await sendRequest("editUser", {
        id: props.user,
        action: "setPermission",
        permission: perm,
        value: !user.value.permissions.includes(perm)
    })).user;
    users.updateUser(user.value);
}
let router = useRouter();
if(!myUser.hasPermission("users.permissions.read")) {
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
        <table>
            <tr>
                <th>Permission</th>
                <th>Enabled</th>
                <th>Toggle</th>
            </tr>
            <tr v-for="perm of validPermissions" v-if="myUser.hasPermission('users.permissions.read')" :key="perm">
                <td>
                    {{  perm  }}
                </td> 
                <td :class="(user.permissions.includes(perm) ? 'green' : 'red')">
                    {{  user.permissions.includes(perm) ? "Yes" : "No" }}
                </td>
                <td>
                    <button v-if="myUser.hasPermission(perm) && myUser.hasPermission('users.permissions.write')" @click="togglePerm(perm)">Toggle</button>
                </td>
            </tr>
        </table>
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

table > tr > th {
    /* Center */
    text-align: left;
    margin-left: 100;
}
table {
    width: 100%;
}
td, th, .manage-btn {
  border: 1px solid #dddddd;
  text-align: left;
}
tr:nth-child(even) {
  background-color: #383535;
}
</style>