import { rollup } from "rollup";
import fs from "node:fs";
import commonjs from '@rollup/plugin-commonjs';
import json from "@rollup/plugin-json"
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import esbuild from "esbuild";
import path from "path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import packageJSON from "../package.json" assert {type: "json"}
console.time("Total");
try {
    fs.rmSync("_build", {recursive: true})
} catch {}
let fileData = "";
let files = fs.readdirSync("src/packets");
files.forEach((f) => {
    fileData += `import ${f.replace(".ts", "")} from "./dist/Server/src/packets/${f.replace(".ts", ".js")}";\n`;
});
fileData += `export default [${files.map(f => f.replace(".ts", "")).join(", ")}];\n`;
fs.writeFileSync("packets.mjs", fileData);
console.time("Build TS");
let backendBuild = spawn("npm", ["run", "build"]);
let backendExitcode = await once(backendBuild, "exit");
if(backendExitcode[0] != 0) {{
    console.log("Backend build failed with code " + backendExitcode);
    process.exit(1);
}}
console.timeEnd("Build TS");
console.time("Rollup");
let build = await rollup({
    input: {
        input: "./dist/Server/src/index.js",
    },
    plugins: [commonjs(), nodeResolve({browser: false, exportConditions: ["node"]}), json(), replace({
        "process.env.NODE_ENV": JSON.stringify('production'),
        preventAssignment: true
    })],
      onwarn(msg) {
        if(/Circular dependency\: dist\/(.+) -> dist\/(.+)/.test(msg.message)) {
            console.warn("Warning: " + msg.message);
        }
      }
});
await build.write({
    format: "esm",
    dir: "_build",
    inlineDynamicImports: true,
    minifyInternalExports: true,
});
console.timeEnd("Rollup")
console.time("ESBuild");
await esbuild.build({
    entryPoints: ["_build/input.js"],
    minify: true,
    outfile: "_build/burgerpanel.mjs",
});
console.timeEnd("ESBuild");
fs.rmSync("_build/input.js");
fs.copyFileSync("../LICENSE", "_build/LICENSE.txt");
fs.copyFileSync("../README.md", "_build/README.txt");
console.time("Build Frontend");
let frontendResponse = spawn("npm", ["run", "build"], {cwd: "../Web/"});
let frontendExitCode = await once(frontendResponse, "exit");
if(frontendExitCode[0] != 0) {
    console.log("Frontend failed");
    process.exit(1);
}
fs.cpSync("../Web/dist/", "_build/Web", {recursive: true});
console.timeEnd("Build Frontend");
fs.writeFileSync("_build/mongodb_url.txt", "mongodb://burgerpanel:burgerpanel@localhost:27017/burgerpanel");
console.time("Zip");
try {
    spawnSync("7z", ["a", `../BurgerPanel-${packageJSON.version}.zip`, "*"], {cwd: path.join(process.cwd(), "_build")})
} catch {
    console.log("Unable to zip. Make sure 7z is installed.")
}
console.timeEnd("Zip");
console.timeEnd("Total");