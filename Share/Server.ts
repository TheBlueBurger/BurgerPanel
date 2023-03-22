export interface Server {
    _id: string;
    name: string;
    path: string;
    mem: number;
    allowedUsers: string[];
    version: string;
    software: "vanilla" | "purpur" | "paper";
    port: number;
    autoStart: boolean;
}