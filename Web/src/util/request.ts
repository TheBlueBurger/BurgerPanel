import { useWS } from "@stores/ws";
import type {Request, RequestResponses} from "@share/Requests";

export default async function sendRequest<T extends Request>(packetName: T, data: any = {}, infoBoxIfError: boolean = true): Promise<RequestResponses[T]> {
    // Only exists for compatibility reasons, everything will be migrated soon
    let ws = useWS();
    return await ws.sendRequest(packetName, data, infoBoxIfError);
}

export async function sendRequestIgnoredType(packetName: string, data: any = {}, infoBoxIfError: boolean = true) {
    return await sendRequest(packetName as Request, data, infoBoxIfError);
}