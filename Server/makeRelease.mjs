import { rollup } from "rollup";
import fs from "node:fs";
import commonjs from '@rollup/plugin-commonjs';
import json from "@rollup/plugin-json"
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import esbuild from "esbuild";
import license from "rollup-plugin-license";
import path from "path";
import { spawnSync } from "node:child_process";
import packageJSON from "./package.json" assert {type: "json"}
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
spawnSync("npm", ["run", "build"]);
console.timeEnd("Build TS");
console.time("Rollup");
let build = await rollup({
    input: {
        input: "./dist/Server/src/index.js",
    },
    plugins: [commonjs(), nodeResolve({browser: false, exportConditions: ["node"]}), json(), replace({
        "process.env.NODE_ENV": JSON.stringify('production'),
        preventAssignment: true
    }), license({
        sourcemap: true,
        cwd: process.cwd(), // The default
        thirdParty: {
          includePrivate: true, // Default is false.
          output: {
            file: path.join(process.cwd(), '_build', 'THIRD_PARTY_LICENSES.txt'),
            encoding: 'utf-8', // Default is utf-8.
          },
        },
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
    minifyInternalExports: true
});
console.timeEnd("Rollup")
console.time("ESBuild");
await esbuild.build({
    entryPoints: ["_build/input.js"],
    minify: true,
    outfile: "_build/burgerpanel.mjs"
});
console.timeEnd("ESBuild");
fs.rmSync("_build/input.js");
fs.copyFileSync("../LICENSE", "_build/LICENSE.txt");
fs.copyFileSync("../README.md", "_build/README.txt");
console.time("Build Frontend");
spawnSync("npm", ["run", "build"], {cwd: "../Web/"});
fs.cpSync("../Web/dist/", "_build/Web", {recursive: true});
console.timeEnd("Build Frontend");
fs.writeFileSync("_build/mongodb_url.txt", "mongodb://burgerpanel:burgerpanel@localhost:27017/burgerpanel");
fs.copyFileSync("../Web/THIRD_PARTY_LICENSES_WEB.txt", "_build/THIRD_PARTY_LICENSES_WEB.txt");
console.time("Zip");
try {
    spawnSync("7z", ["a", `../BurgerPanel-${packageJSON.version}.zip`, "*"], {cwd: path.join(process.cwd(), "_build")})
} catch {
    console.log("Unable to zip. Make sure 7z is installed.")
}
console.timeEnd("Zip");
console.timeEnd("Total");
