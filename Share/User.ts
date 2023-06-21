import { PermissionString } from "./Permission";

export interface User {
    _id: string;
    username: string;
    createdAt: Date;
    token: string;
    permissions: PermissionString[];
    password?: string;
    setupPending: boolean;
    devMode?: boolean;
    pins?: string[];
}
