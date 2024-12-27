<script setup lang="ts">
import { computed, inject, onMounted, Ref, ref } from "vue";
import {
    Config,
    ConfigValue,
    defaultConfig,
    descriptions,
    disabledEditingFrontend,
} from "@share/Config";
import { User } from "@share/User";
import EventEmitter from "@util/event";
import { useRouter } from "vue-router";
import TextInput from "@components/TextInput.vue";
import Dropdown from "@components/Dropdown.vue";
import sendRequest from "@util/request";
import titleManager from "@util/titleManager";
import { confirmModal, modalInput, showInfoBox } from "@util/modal";
import { useUser } from "@stores/user";
import { useUsers } from "@stores/users";
import { useSettings } from "@stores/settings";
let settings = useSettings();
let router = useRouter();
const user = useUser();
let users = useUsers();
let allUsers = computed(() => users.users);
await Promise.all([
    (async () => {
        if (user.hasPermission("settings.read")) {
            await settings.getAllSettings();
        }
    })(),
    (async () => {
        if (user.hasPermission("users.view")) {
            await users.getAllUsers();
        }
    })(),
]);
let events: Ref<typeof EventEmitter> = inject("events") as Ref<
    typeof EventEmitter
>;
if (!user.hasPermission("settings.read") && !user.hasPermission("users.view")) {
    showInfoBox(
        "Permission error",
        "You do not have permission to access this page.\nRedirecting to home.",
    );
    router.push({
        path: "/",
    });
}
async function changeOption(
    option: keyof typeof defaultConfig,
    newValue: string,
) {
    try {
        if (!newValue) return;
        let val = await settings.setSetting(option, newValue);
        events.value.emit("createNotification", "Successfully changed option");
    } catch (e) {
        showInfoBox(`Could not change '${option}'`, `Error: ${e}`);
    }
}

let creatingUser = ref(false);
let newUsername = ref("");
async function createUser() {
    let resp = await sendRequest("createUser", {
        username: newUsername.value,
    });
    newUsername.value = "";
    creatingUser.value = false;
    events.value.emit(
        "createNotification",
        "User " + resp.user.username + " created",
    );
    users.users.push(resp.user);
}
async function deleteUser(user: User) {
    if (
        !(await confirmModal(
            "Delete user?",
            "Are you sure you want to remove the user " + user.username + "?",
            true,
            true,
            true,
        ))
    )
        return;
    await sendRequest("deleteUser", {
        id: user.id,
    });
    users.removeUserFromCache(user);
}

let knownTokens: Ref<{ [id: string]: string }> = ref({});
let viewingToken = ref(-1);
async function getToken(userID: number) {
    let resp = await sendRequest("getUserToken", {
        id: userID,
    });
    knownTokens.value[userID] = resp.token;
    return resp.token;
}
async function viewToken(userID: number, copy: boolean = false) {
    if (viewingToken.value == userID) {
        viewingToken.value = -1;
        return;
    }
    if (knownTokens.value[userID] && !copy)
        viewingToken.value == userID ? "" : userID;
    let token = await getToken(userID);
    if (!copy) viewingToken.value = userID;
    else copyToClip(token);
}
async function copyLoginURL(userID: number) {
    let token = await getToken(userID);
    copyToClip(`${location.origin}/?useToken=${token}`);
}
function copyToClip(text: string) {
    navigator.clipboard.writeText(text);
    events.value.emit("createNotification", "Copied to clipboard");
}
let sortedUsers = computed(() => {
    return allUsers.value.sort((a, b) => {
        return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    });
});
let settingsAllowedToShow = computed(() => {
    return Object.keys(defaultConfig).filter((c) => {
        return !disabledEditingFrontend.some((d) => c.startsWith(d));
    });
});
async function resetToken(id: number) {
    if (
        !(await confirmModal(
            "Reset token",
            "All sessions will be logged out. Auto-login will break for all sessions.",
        ))
    )
        return;
    await sendRequest("editUser", {
        action: "resetToken",
        id,
    });
    events.value.emit("createNotification", "Token has been reset!");
}
titleManager.setTitle("Settings");
let dropdownRefs = {} as { [e: number]: any };
function getDropdownRefs(uid: number) {
    if (typeof dropdownRefs[uid] == "undefined") dropdownRefs[uid] = ref();
    return dropdownRefs[uid];
}
async function renameUser(id: number) {
    let modalResp = await modalInput(
        "Rename",
        [
            {
                id: "name",
                type: "TextInput",
                data: {
                    inputType: "text",
                    placeholder: "New name",
                    maxLength: 24,
                },
            },
        ],
        `Set the username of '${(await users.getUserByID(id)).username}'`,
        "OK_CANCEL",
    );
    let newName = modalResp?.inputs?.name;
    if (!newName) return;
    let resp = await sendRequest("editUser", {
        id,
        action: "changeUsername",
        username: newName,
    });
    users.updateUser(resp.user);
    await showInfoBox(
        "Name change successful",
        `Successfully changed the name to '${newName}'`,
    );
}
let clients = ref(
    [] as {
        username?: string | undefined;
        id?: number | undefined;
    }[],
);
onMounted(async () => {
    if (user.hasPermission({ all: ["users.view", "serverinfo.clients.count"] }))
        clients.value = await sendRequest("listSessions");
});
</script>
<template>
    <div v-if="user.hasPermission('settings.read')" class="settingsblock">
        <h2>Settings</h2>
        <div v-for="option of settingsAllowedToShow">
            <span
                class="setting-span"
                :title="descriptions[option as keyof typeof defaultConfig]"
                >{{ option }}</span
            >
            <TextInput
                :default="
                    (
                        settings.settings[option as keyof Config] as ConfigValue
                    ).toString()
                "
                @set="(v) => changeOption(option as keyof Config, v)"
                v-if="
                    typeof settings.settings[option as keyof Config] !=
                    'undefined'
                "
            />
        </div>
    </div>
    <div
        v-if="user.hasPermission('settings.logging.set')"
        class="loggingsettings"
    >
        <RouterLink
            :to="{
                name: 'logging',
            }"
            ><button>Logging Settings</button></RouterLink
        >
    </div>
    <div class="usersthing">
        <hr v-if="user.hasPermission('users.view')" />
        <h3>Users</h3>
        <div>
            <button @click="creatingUser = !creatingUser">
                {{ !creatingUser ? "Add user" : "Close" }}
            </button>
        </div>
        <div v-if="creatingUser">
            <form @submit.prevent="createUser()">
                Username:
                <input
                    type="text"
                    placeholder="Username"
                    v-model="newUsername"
                /><br />
                <button type="submit">Create user</button>
            </form>
        </div>
    </div>
    <div id="users">
        <div
            v-for="_user in sortedUsers"
            class="user"
            @contextmenu.prevent="
                (e) => dropdownRefs[_user.id].value[0].show(e)
            "
        >
            <div class="user-content">
                <h3>{{ _user.username }}</h3>
                <p>ID: {{ _user.id }}</p>
                <p>
                    Created at: {{ new Date(_user.createdAt).toLocaleString() }}
                </p>
                <p v-if="_user.setupPending"><i>(Setup pending)</i></p>
                <p v-if="clients.some((c) => c.id == _user.id)">
                    Currently logged in!
                </p>
                <Dropdown
                    :ref="getDropdownRefs(_user.id)"
                    :create-on-cursor="true"
                >
                    <div id="dropdown-inner">
                        <button
                            @click="
                                () => {
                                    renameUser(_user.id);
                                    dropdownRefs[_user.id].value[0].hide();
                                }
                            "
                        >
                            Rename
                        </button>
                        <br />
                        <RouterLink
                            :to="{
                                name: 'editUserPermissions',
                                params: {
                                    user: _user.id,
                                },
                            }"
                        >
                            <button>Edit permissions</button>
                        </RouterLink>
                        <br />
                        <button
                            @click="
                                () => {
                                    viewToken(_user.id, true);
                                    dropdownRefs[_user.id].value[0].hide();
                                }
                            "
                        >
                            Copy token
                        </button>
                        <br />
                        <button
                            @click="
                                () => {
                                    copyLoginURL(_user.id);
                                    dropdownRefs[_user.id].value[0].hide();
                                }
                            "
                        >
                            Copy login URL
                        </button>
                        <br />
                        <button
                            @click="
                                () => {
                                    resetToken(_user.id);
                                    dropdownRefs[_user.id].value[0].hide();
                                }
                            "
                        >
                            Reset token
                        </button>
                        <br />
                        <button
                            @click="
                                () => {
                                    deleteUser(_user);
                                    dropdownRefs[_user.id].value[0].hide();
                                }
                            "
                        >
                            Delete account
                        </button>
                    </div>
                </Dropdown>
            </div>
        </div>
    </div>
</template>
<style scoped>
.settingsblock {
    margin-left: 10px;
    margin-top: 10px;
}
.settingsblock * {
    margin: 5px;
}
#dropdown-inner button {
    width: 100%;
    border-radius: 0;
}
#dropdown-inner {
    border-radius: 10px;
}
.user {
    background-color: #2e2e2e;
    min-width: 300px;
    margin-left: 10px;
    border-radius: 10px;
    justify-content: left;
    margin-bottom: 5px;
    text-align: center;
}
.loggingsettings {
    margin-left: 20px;
    margin-top: 5px;
    margin-bottom: 15px;
}

.usersthing {
    margin-top: 10px;
}

.usersthing button {
    margin: 2px 5px;
}

.usersthing h3 {
    margin: 5px 10px;
}
#users {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
}
#users .user,
#users .user-content p,
#users .user-content {
    margin: 5px;
}
.user-content {
    padding-bottom: 75px;
    padding-right: 10px;
}
.setting-span {
    cursor: help;
    margin-right: 10px;
}
h2 {
    margin-top: 10px;
}
</style>
