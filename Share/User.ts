export interface User {
    id: number;
    username: string;
    createdAt: Date;
    token: string;
    permissions: string;
    password?: string;
    setupPending: boolean;
    devMode: boolean;
}
