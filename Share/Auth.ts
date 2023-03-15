import { Server } from "./Server.js";
import type { User } from "./User.js";
export interface AuthS2C {
    type: "auth";
    success: boolean;
    message?: string;
    alreadyAuthenticated?: boolean;
    user?: User;
    servers?: Server[];
    emitEvent?: boolean;
    emits?: string[];
}