import gulp from "gulp";
const { series, parallel } = gulp;
import { spawnSync, execSync } from "node:child_process";
import fs, { existsSync, readdirSync, rmSync } from "node:fs";
import esbuild from "esbuild";
import { rollup } from "rollup";
import commonjs from '@rollup/plugin-commonjs';
import json from "@rollup/plugin-json"
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import packageJSON from "./package.json" assert {type: "json"}
import path from "path";

async function installWebIfForgotten() {
    if(!existsSync("../Web/node_modules")) {
        console.log("Installing web packages...");
        execSync("pnpm i", {
            cwd: "../Web"
        });
    }
}

async function prepareBuildInfo() {
    await import("./buildTools/buildInfo.mjs");
}

async function buildWeb() {
    await import("./buildTools/packetsToFile.mjs");
    execSync("pnpm build", {cwd: "../Web"});
}

export async function packetsToFile() {
    let fileData = "";
    let files = fs.readdirSync("src/packets");
    if(process.env.BURGERPANEL_SKIP_SERVER != "1") {
        files.forEach((f) => {
            fileData += `import ${f.replace(".ts", "")} from "./dist/Server/src/packets/${f.replace(".ts", ".js")}";\n`;
        });
        fileData += `export default [${files.map(f => f.replace(".ts", "")).join(", ")}];\n`;
        fs.writeFileSync("packets.mjs", fileData);
    }
}

export async function buildServer() {
    await packetsToFile();
    execSync("pnpm build");
}

async function runRollup() {
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
}

async function runESBuild() {
    await esbuild.build({
        entryPoints: ["_build/input.js"],
        minify: true,
        target: "es2022",
        outfile: "_build/burgerpanel.mjs",
    });
}

async function zip() {
    if(process.env.SKIP_ZIP == "1") return;
    let filename = process.env.EXCLUDE_VERSION == 1 ? "../BurgerPanel.zip" : `../BurgerPanel-${packageJSON.version}.zip`
    spawnSync("7z", ["a", filename, "*"], {cwd: path.join(process.cwd(), "_build")})
}

function tryRMSync(...args) {
    try {
        rmSync(...args);
    } catch (err) {
        console.log(`Could not delete ${args[0]}: ${err}`)
    }
}

async function clean() {
    let files = readdirSync(".");
    let oldZips = files.filter(filename => {
        return filename.startsWith("BurgerPanel-") && filename.endsWith(".zip")
    });
    oldZips.forEach(oldZip => {
        rmSync(oldZip);
    });
    await tryRMSync("_build", {
        recursive: true,
        force: true
    });
    await tryRMSync("../Share/Packets.ts");
    await tryRMSync("dist", {
        recursive: true,
        force: true
    });
    await tryRMSync("../Web/dist", {
        recursive: true,
        force: true
    });
}

async function copyFiles() {
    fs.rmSync("_build/input.js");
    fs.copyFileSync("../LICENSE", "_build/LICENSE.txt");
    fs.copyFileSync("../README.md", "_build/README.txt");
    if(!process.env.SKIP_WEB) fs.cpSync("../Web/dist/", "_build/Web", {recursive: true});
    fs.writeFileSync("_build/mongodb_url.txt", "json:data.json");
}

async function serverSeries() {
    await buildServer();
    await runRollup();
    await runESBuild();
}

export async function serverOnly() {
    process.env.SKIP_WEB = 1;
    return await series(prepare, serverSeries, copyFiles)();
}

function buildAndBundle() {
    return series(
        clean,
        installWebIfForgotten,
        prepareBuildInfo,
        parallel(buildWeb, serverSeries),
        copyFiles,
        zip
    )
}

export async function prepare() {
    return await series(
        clean,
        prepareBuildInfo
    )()
}

export default buildAndBundle();