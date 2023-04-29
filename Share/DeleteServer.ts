export interface DeleteServerS2C {
    type: "deleteServer";
    success: boolean;
    message?: string;
    serverName?: string;
    emits?: string[];
}