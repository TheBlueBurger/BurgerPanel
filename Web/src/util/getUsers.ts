import { hasPermission } from "../../../Share/Permission";
import { User } from "../../../Share/User";
import event from "./event";

let allUsersAlreadyCached = false;
// idont think we can inject outside of vue so i have  "legal" way to do it lol
export default async function getUsers(cachedUsers: Map<string, User>, refresh: boolean = false): Promise<Map<string, User>> {
    let user = await getCurrentUser();
    if(!hasPermission(user, "users.view")) throw new Error("Attempted to get user list but not authenticated.");
    if(allUsersAlreadyCached && !refresh) return cachedUsers;
    event.emit("sendPacket", {
        type: "getUsers",
    });
    let resp = await event.awaitEvent("getUsers");
    if(resp.success) {
        resp.userList.forEach((u: User) => {
          cachedUsers.set(u._id, u);
        });
        allUsersAlreadyCached = true;
    } else throw new Error(resp.message);
    return cachedUsers;
}

async function getCurrentUser(): Promise<User> {
    setTimeout(() => {
        event.emit("getLoginStatus");
    });
    let resp = await event.awaitEvent("getLoginStatus-resp");
    return resp; // legal?
}
// now we use that to check perms
export async function getUser(userID: string, cachedUsers: Map<string, User>, refresh: boolean = false) {
    // idk how to make this good
    let user = await getCurrentUser();
    if(!hasPermission(user, "users.view")) throw new Error("Attempted to get user list but not authenticated.");
    let cachedUser = cachedUsers.get(userID);
    if(cachedUser && !refresh) return cachedUser;
    // otherwise we get it from the api
    event.emit("sendPacket", {
        type: "getUserData",
        id: userID
    });
    let resp = await event.awaitEvent("getUserData-"+userID);
    if(resp.success) {
        cachedUsers.set(resp.user._id, resp.user);
        return resp.user;
    }
    throw new Error(resp.message);
}
