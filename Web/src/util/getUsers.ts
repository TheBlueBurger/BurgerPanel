import { hasPermission } from "../../../Share/Permission";
import { User } from "../../../Share/User";
import { useUser } from "../stores/user";
import event from "./event";
import sendRequest from "./request";

let allUsersAlreadyCached = false;
// idont think we can inject outside of vue so i have  "legal" way to do it lol
export default async function getUsers(cachedUsers: Map<string, User>, refresh: boolean = false): Promise<Map<string, User>> {
    let user = await getCurrentUser();
    if(!hasPermission(user, "users.view")) throw new Error("Attempted to get user list but not authenticated.");
    if(allUsersAlreadyCached && !refresh) return cachedUsers;
    let users = (await sendRequest("getUsers")).userList;
    cachedUsers.clear();
    users.forEach((u: User) => {
        cachedUsers.set(u._id, u);
    });
    allUsersAlreadyCached = true;
    return cachedUsers;
}

async function getCurrentUser(): Promise<User> {
    let user = useUser().user;
    if(!user) throw new Error("Not logged in and trying to get users in getUsers.ts!!!");
    return user;
}
// now we use that to check perms
export async function getUser(userID: string, cachedUsers: Map<string, User>, refresh: boolean = false) {
    // idk how to make this good
    let user = await getCurrentUser();
    if(!hasPermission(user, "users.view")) throw new Error("Attempted to get user list but not authenticated.");
    let cachedUser = cachedUsers.get(userID);
    if(cachedUser && !refresh) return cachedUser;
    // otherwise we get it from the api
    let data = await sendRequest("getUserData", {id: userID})
    cachedUsers.set(data.user._id, data.user);
    return data.user;
}
