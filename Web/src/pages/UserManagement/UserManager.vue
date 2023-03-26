<script setup lang="ts">
import { inject, onMounted, Ref, ref } from 'vue';
import { useRouter } from 'vue-router';
import { User } from '../../../../Share/User';
import event from '../../util/event';
import { getUser } from '../../util/getUsers';
let router = useRouter(); // array > all but ig u can change to map
let user = ref() as Ref<User>;
    let props = defineProps({
        user: {
            required: true,
            type: String
        }
});
let viewingToken = ref(false);
let token = ref("");
let cachedUsers = inject("users") as Ref<Map<string, User>>;
onMounted(async () => {
    try {
        user.value = await getUser(props.user, cachedUsers.value);
    } catch(err) {
        alert(err);
        router.push("/settings");
    }
});
async function viewToken(userID: string, copy: boolean = false) {
    if (token.value && !copy) viewingToken.value = !viewingToken.value;
    await event.emit("sendPacket", {
        type: "getUserToken",
        id: userID
    });
    let resp = await event.awaitEvent("getUserToken-" + userID);
    if (resp?.success) {
        token.value = resp.token;
        if (!copy) viewingToken.value = true;
        else copyToClip(resp?.token);
    } else {
        alert("Failed to get user token: " + resp.message);
    }
}
function copyToClip(text: string) {
    navigator.clipboard.writeText(text);
    event.emit("createNotification", "Copied to clipboard");
}
function editPermissions() {
    router.push({
        name: "editUserPermissions",
        params: {
            user: props.user
        }
    });
}
function deleteUser() {
    
}
</script>
<template>
    <div v-if="user">
        <hr>
        ID: {{ user._id }} <button @click="deleteUser()">Delete</button>
        <br>
        Username: {{ user.username }}
        <br>
        Created at: {{ new Date(user.createdAt).toLocaleString() }}
        <br>
        Token: {{ viewingToken ? token : "<Hidden>" }} <button @click="viewToken(user._id)">View
                token</button> <button @click="viewToken(user._id, true)">Copy to clipboard</button>
            <br>
            <button @click="editPermissions">Edit permissions</button>
    </div>
    <div v-else>
        Loading...
    </div>
</template>