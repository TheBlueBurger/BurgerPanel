import { defineStore } from "pinia";
import { Ref, ref } from "vue";
import { User } from "@share/User";
import sendRequest from "@util/request";
import event from "@util/event";
import { Permission, hasServerPermission as _hasServerPermission, hasPermission as _hasPermission, ServerPermissions } from "@share/Permission";
import { Server } from "@share/Server";
import { useServers } from "./servers";
import { RequestResponses } from "@share/Requests";
import { useWS } from "./ws";

export const useUser = defineStore("user", () => {
    const user: Ref<User | undefined> = ref();
    const failedLogin: Ref<boolean> = ref(false);
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
        let testToken = localStorage.getItem("token")
        if (testToken) {
            try {
                await loginToken(testToken);
            } catch {
                failedLogin.value = true;
                localStorage.removeItem("token");
                return false;
            }
            return true;
        }
        return false;
    }
    function resetUser() {
        user.value = undefined;
    }
    async function loginToken(token: string) {
        let resp = await sendRequest("auth", {token}, false);
        handleLoginPacket(resp);
    }
    async function loginUsernamePass(username: string, password: string) {
        let resp = await sendRequest("auth", {username, password}, false);
        handleLoginPacket(resp);
    }
    
    function handleLoginPacket(packet: RequestResponses["auth"]) {
        failedLogin.value = true;
        localStorage.setItem("token", packet.user.token);
        if(packet.servers) {
            let servers = useServers();
            servers.addServers(packet.servers);
        }
        if(packet.statuses) {
            let servers = useServers();
            servers.addStatuses(packet.statuses);
        }
        user.value = packet.user;
    }
    return { user, logout, hasPermission, hasServerPermission, autoLogin, resetUser, loginToken, loginUsernamePass, failedLogin }
});