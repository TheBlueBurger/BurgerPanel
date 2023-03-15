export interface Server {
    _id: string;
    name: string;
    path: string;
    mem: number;
    allowedUsers: string[];
    version: string;
    software: string;
    port: number;
    autoStart: boolean;
}