import event from "./event";

let currentRequestID = 0;
export default async function sendRequest(packetName: Request, data: any) {
    let thisRequestID = currentRequestID++;
    event.emit("sendPacket", {
        n: packetName,
        d: data,
        r: currentRequestID
    });
    let resp = await event.awaitEvent(thisRequestID.toString());
    if(resp.e) {
        throw new Error(resp.m);
    }
    return resp.r;
}
