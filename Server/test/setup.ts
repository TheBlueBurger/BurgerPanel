import { afterAll } from "vitest";
import getPortByName from "./getPort";
import fs from "node:fs";
import url from 'node:url';
import path from 'node:path';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
let sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
afterAll(async (f) => {
    let a = f.filepath?.split("/Server/test/")[1];
    if(typeof a != "string") {
        console.log("did the dir structure change?");
        process.exit();
    }
    let p = getPortByName(a);
    let pid;
    try {
        pid = parseInt(fs.readFileSync(path.join(__dirname, "../test-context", p.toString(), "pid.txt")).toString());
    } catch {
        console.log(`Can't find PID! Port ${p}`);
        return;
    }
    process.kill(pid, "SIGTERM");
    console.log(`Killing PID: ${pid}, test: ${a}, port: ${p}`);
    fs.rmSync(path.join(__dirname, "../test-context", p.toString()), {recursive: true});
    let started = Date.now();
    while(true) {
        if(started + 130_000 < Date.now()) {
            console.log(`I give up waiting for PID: ${pid}, test: ${a}, port: ${p}, so its murder time ig`)
            process.kill(pid, "SIGKILL");
        }
        await sleep(50);
        if(!fs.existsSync("/proc/" + pid)) break;
    }
    console.log(`Killed PID: ${pid}, test: ${a}, port: ${p}`)
})