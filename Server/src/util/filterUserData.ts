import { User } from "../../../Share/User.js";

export default function filterUserData(user: User) {
    return {
        ...user,
        token: "",
        password: ""
    }
}