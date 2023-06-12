import { defineStore } from "pinia";
import { ref } from "vue";
import { User } from "../../../Share/User";
import sendRequest from "../util/request";

export const useUsers = defineStore("users", () => {
    let users = ref([] as User[]);
    let allUsersFetched = false;
    async function getAllUsers() {
        if(allUsersFetched) return users.value;
        let allUsers = await sendRequest("getUsers");
        users.value = allUsers.userList;
        allUsersFetched = true;
        return allUsers.userList;
    }
    async function getUserByID(id: string) {
        if(allUsersFetched) {
            let user = users.value.find(u => u._id == id);
            if(!user) throw new Error("all users already cached and cannot find " + id);
            return user;
        }
        let user = await sendRequest("getUserData", {
            id
        });
        users.value.push(user.user);
        return user.user;
    }
    function updateUser(user: User) {
        if(!user._id) throw new Error("Invalid user when updating!");
        removeUserFromCache(user);
        users.value.push(user);
    }
    function removeUserFromCache(user: User) {
        users.value = users.value.filter(u => u._id != user._id);
    }
    return {users, getAllUsers, getUserByID, updateUser, removeUserFromCache}
})