import { defineStore } from "pinia";
import { Ref, ref } from "vue";
import { User } from "@share/User";
import sendRequest from "@util/request";
import event from "@util/event";
import { Permission, hasServerPermission as _hasServerPermission, hasPermission as _hasPermission, ServerPermissions } from "@share/Permission";
import { Server } from "@share/Server";
import { useServers } from "./servers";

export const useUser = defineStore("user", () => {
    const user: Ref<User | undefined> = ref();
    function logout() {
        if(user.value == undefined) throw new Error("already logged out");
        localStorage.removeItem("token");
        sendRequest("logout");
        user.value = undefined;
        event.emit("logout");
    }
    function hasPermission(permission: Permission) {
        return _hasPermission(user.value, permission);
    }
    function hasServerPermission(server: Server, permission: ServerPermissions) {
        return _hasServerPermission(user.value, server, permission);
    }
    async function autoLogin() {
        if (localStorage.getItem("token")) {
            let resp = await sendRequest("auth", {
                token: localStorage.getItem("token")
            }, false);
            if(resp.servers) {
                let servers = useServers();
                servers.addServers(resp.servers);
            }
            if(resp.statuses) {
                let servers = useServers();
                servers.addStatuses(resp.statuses);
            }
            user.value = resp.user;
            return true;
        } return false;
    }
    return { user, logout, hasPermission, hasServerPermission, autoLogin }
})