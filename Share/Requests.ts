import { Config, ConfigValue } from "./Config";
import { ServerPerformancePacketS2C } from "./Perf";
import { Server, ServerStatus, ServerStatuses } from "./Server";
import { User } from "./User";

export type RequestResponses = {
    attachToServer: {
        server: Server,
        lastLogs?: string[],
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
    },
    getAllServers: {
        servers: Server[],
        statuses: ServerStatuses // yes im "documenting" all the packets with proper autocomplete
    },
    getAllSettings: {
        [key in keyof Config]: ConfigValue
    },
    getServer: {
        server: Server,
        status?: ServerStatus
    },
    getSetting: {
        value: ConfigValue
    },
    getUserData: {
        user: User
    },
    getUsers: {
        userList: User[]
    },
    getUserToken: {
        token: string
    },
    importServer: {
        server: Server,
        type: "success"
    } | {
        autodetect: {
            version: string,
            software: string,
            port: number
        },
        type: "autodetect"
    },
    killServer: undefined,
    logging: undefined,
    ping: undefined,
    serverFiles: {
        files: {
            name: string,
            folder: boolean
        }[],
        type: "filelist"
    } | {
        fileData: string,
        type: "data"
    },
    serverLogs: {
        files: string[],
        type: "list"
    } | {
        log: string,
        type: "log"
    },
    serverPerformance: ServerPerformancePacketS2C,
    setServerOption: {
        server: Server
    }
    setSetting: {
        key: string,
        value: ConfigValue
    },
    startServer: undefined,
    stopServer: undefined,
    writeToConsole: undefined
}


export type Request = keyof RequestResponses;
