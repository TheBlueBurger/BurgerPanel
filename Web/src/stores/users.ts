import { defineStore } from "pinia";
import { ref } from "vue";
import { User } from "@share/User";
import sendRequest from "@util/request";

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
    async function getUserByID(id: number | string) {
        const usedID = typeof id == "string" ? parseInt(id) : id;
        let user = users.value.find(u => u.id == usedID);
        if(user) return user;
        if(allUsersFetched) throw new Error("all users already cached and cannot find " + usedID);
        user = (await sendRequest("getUserData", {
            id: usedID
        })).user;
        users.value.push(user);
        return user;
    }
    function updateUser(user: User) {
        if(!user.id) throw new Error("Invalid user when updating!");
        removeUserFromCache(user);
        users.value.push(user);
    }
    function removeUserFromCache(user: User) {
        users.value = users.value.filter(u => u.id != user.id);
    }
    return {users, getAllUsers, getUserByID, updateUser, removeUserFromCache}
})