import { PermissionString } from "./Permission";
import {Role} from "./Role";

export interface User extends SkeletonUser {
    roles: Role[];
}
interface SkeletonUser {
    _id: string;
    username: string;
    createdAt: Date;
    token: string;
    permissions: PermissionString[];
    password?: string;
    setupPending: boolean;
}
export interface UserWithoutRoles extends SkeletonUser {
    roles: string[];
}
