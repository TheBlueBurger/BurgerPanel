import event from "./event";
import type {Request, RequestResponses} from "../../../Share/Requests";

let currentRequestID = 0;
export default async function sendRequest<T extends Request>(packetName: T, data: any = {}): Promise<RequestResponses[T]> {
    let thisRequestID = currentRequestID++;
    event.emit("sendPacket", {
        n: packetName,
        d: data,
        r: thisRequestID
    });
    let resp = await event.awaitEvent(thisRequestID.toString());
    if(resp.e) {
        throw new Error(resp.e);
    }
    return resp.d;
}
