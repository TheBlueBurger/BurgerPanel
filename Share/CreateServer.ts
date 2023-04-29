import { Server } from "./Server.js";

export interface CreateServerS2C {
    type: "createServer";
    success: boolean;
    message?: string;
    server?: Server;
};
