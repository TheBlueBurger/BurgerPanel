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
    },
    createUser: {
        user: User
    },
    deleteServer: undefined,
    deleteUser: undefined,
    detachFromServer: undefined,
    editUser: {
        user: User,
        token?: string
    }
}


export type Request = keyof RequestResponses;
