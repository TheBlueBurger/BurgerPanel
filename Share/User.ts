import { PermissionString } from "./Permission";

export interface User {
    _id: string;
    username: string;
    admin: boolean;
    createdAt: Date;
    token: string;
    permissions: PermissionString[];
}
