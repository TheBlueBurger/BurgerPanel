import event from "./event";
import type {Request, RequestResponses} from "@share/Requests";
import { showInfoBox } from "./modal";

let currentRequestID = 0;
export default async function sendRequest<T extends Request>(packetName: T, data: any = {}, infoBoxIfError: boolean = true): Promise<RequestResponses[T]> {
    let thisRequestID = currentRequestID++;
    event.emit("sendPacket", {
        n: packetName,
        d: data,
        r: thisRequestID
    });
    let resp = await event.awaitEvent(thisRequestID.toString());
    if(resp.e) {
        if(infoBoxIfError) showInfoBox("Error in " + packetName, resp.e)
        throw new Error(resp.e);
    }
    return resp.d;
}
