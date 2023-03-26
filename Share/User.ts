import { PermissionString } from "./Permission";

export interface User {
    _id: string;
    username: string;
    createdAt: Date;
    token: string;
    permissions: PermissionString[];
}
