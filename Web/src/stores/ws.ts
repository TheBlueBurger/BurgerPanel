import { defineStore } from "pinia";
import { ref } from "vue";
import { apiUrl } from "@util/api";
import { Request, RequestResponses } from "@share/Requests";
import { showInfoBox } from "@util/modal";

export const useWS = defineStore("ws", () => {
    const ws = ref(null as WebSocket | null);
    let connectAttempt = ref(1);
    function create() {
        if(([WebSocket.OPEN, WebSocket.CONNECTING] as number[]).includes(ws.value?.readyState ?? WebSocket.CLOSED)) return;
        ws.value = new WebSocket(apiUrl.replace("http", "ws"));
        ws.value.addEventListener("message", msg => {
            let data = JSON.parse(msg.data);
            emit("packetRecieved", data);
            emit(data.r, data);
            emit(data.n, data);
            if(data.emits) {
                for (let emitType of data.emits) {
                    emit(emitType, data);
                }
            }
        });
        ws.value.addEventListener("open", () => {
            connectAttempt.value = 1;
            emit("__connected", null);
            connected.value = true;
        });
        ws.value.addEventListener("close", () => {
            connectAttempt.value++;
            connected.value = false;
            setTimeout(() => create(), 1000);
        })
    }
    function emit(eventName: string, data: any) {
        if(typeof callbacks.value[eventName] == "object") callbacks.value[eventName].forEach(cb => cb.cb(data));
        if(typeof onceCBs.value[eventName] == "object") {
            onceCBs.value[eventName].forEach(cb => cb(data));
            onceCBs.value[eventName] = [];
        }
    }
    function send(data: any) {
        ws.value?.send(JSON.stringify(data));
    }
    let callbacks = ref({} as {
        [name: string]: {
            cb: (data: any) => void,
            id: number
        }[]
    });
    let onceCBs = ref({} as {
        [name: string]: ((d: any) => void)[]
    });
    let currentRequestID = ref(0);
    let currentCBID = ref(0);
    // eventname can be a request ID or a emit
    function listenForEvent(eventName: string, cb: (data: any) => void, signal?: AbortSignal) {
        if(typeof callbacks.value[eventName] != "object") callbacks.value[eventName] = [];
        let cbID = currentCBID.value++;
        callbacks.value[eventName].push({cb, id: cbID});
        if(signal) {
            function onAbort() {
                callbacks.value[eventName] = callbacks.value[eventName].filter(a => a.id != cbID);
                signal?.removeEventListener("abort", onAbort);
            }
            signal.addEventListener("abort", onAbort);
        }
    }
    function listenOnce(eventName: string, cb: (data: any) => void) {
        if(typeof onceCBs.value[eventName] != "object") onceCBs.value[eventName] = [];
        onceCBs.value[eventName].push(cb);
    }
    function awaitEvent(eventName: string): Promise<any> {
        return new Promise((res, rej) => {
            listenOnce(eventName, (d) => {
                res(d);
            })
        });
    }
    let connected = ref(false);
    async function sendRequest<T extends Request>(packetName: T, data: any = {}, infoBoxIfError: boolean = true): Promise<RequestResponses[T]> {
        let thisRequestID = currentRequestID.value++;
        send({
            n: packetName,
            d: data,
            r: thisRequestID
        });
        let resp = await awaitEvent(thisRequestID.toString());
        if(resp.e) {
            if(infoBoxIfError) showInfoBox("Error in " + packetName, resp.e)
            throw new Error(resp.e);
        }
        return resp.d;
    }
    async function sendRequestIgnoredType(packetName: string, data: any = {}, infoBoxIfError: boolean = true) {
        return await sendRequest(packetName as Request, data, infoBoxIfError);
    }
    return {ws, create, send, sendRequest, sendRequestIgnoredType, listenForEvent, listenOnce, awaitEvent, connectAttempt, connected};
});