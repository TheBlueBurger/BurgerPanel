import { User } from "../../../Share/User";

export default function filterUserData(user: User) {
    return {
        ...user,
        token: "",
    }
}