import fs from "node:fs";
import os from "node:os";
import { execSync } from "node:child_process";
let userInfo = os.userInfo();
let gitHash;
let branch;
try {
    gitHash = execSync("git rev-parse HEAD").toString().trim();
    branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
} catch {}
import packageJSON from "../package.json" with {type: "json"}
fs.writeFileSync("../Share/BuildInfo.ts", "export let buildInfo = " + JSON.stringify({
    date: Date.now(),
    version: packageJSON.version,
    compiledBy: userInfo.username,
    builtOn: process.platform,
    gitHash,
    branch
}));