/*
so i update my packages and get the weirdest error ever from mongoose: TypeError: Cannot read properties of null (reading 'Connection')
i try to fix for ages and it ONLY happens using rollup
so i go try to use only esbuild and not do the hacky mess i do right now
but dynamic requires arent supported for everything i need
turns out theres a pull request to fix exactly that: https://github.com/evanw/esbuild/pull/2067
but the dev of esbuild decided it would be great to close that PR so i have to do the biggest hack ever by using the banner to insert code that will make require work
still doesnt work, just exits with error code 1 with no error, more debugging and the issue is in a SINGLE circular dependency (index => serverManager (clients) => index)
esbuild doesnt handle that properly so ill just put it in here because i dont even care anymore
*/
import type { User } from "../../Share/User";
import WebSocket from "ws";
export interface OurWebsocketClient extends OurClient,WebSocket {
    type: "Websocket"
}
export interface OurClient {
    data: {
        auth: {
            token?: string,
            user?: User,
            authenticated: boolean,
        },
        clientID: number
    },
    json: (data: any) => void,
    type: "APIRequest" | string
};
export const clients: OurWebsocketClient[] = [];