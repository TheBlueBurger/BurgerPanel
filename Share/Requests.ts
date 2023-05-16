import { Server, ServerStatus, ServerStatuses } from "./Server";
import { User } from "./User";

export type RequestResponses = {
    attachToServer: {
        server: Server,
        lastLogs?: string,
        status?: ServerStatus,
    },
    auth: {
        user: User,
        servers?: Server[],
        statuses?: ServerStatuses
    },
    logout: undefined,
    createServer: {
        server: Server
    }
}


export type Request = keyof RequestResponses;
