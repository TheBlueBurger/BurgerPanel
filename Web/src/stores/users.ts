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
            if(!user) throw new Error("all users cached and cannot find " + id);
            return user;
        }
        let user = await sendRequest("getUserData", {
            id
        });
        users.value.push(user.user);
        return user.user;
    }
    return {users, getAllUsers, getUserByID}
})