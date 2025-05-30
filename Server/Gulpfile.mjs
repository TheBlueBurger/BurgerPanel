import gulp from "gulp";
const { series, parallel } = gulp;
import { spawnSync, execSync } from "node:child_process";
import fs, { existsSync, readdirSync, rmSync } from "node:fs";
import esbuild from "esbuild";
import packageJSON from "./package.json" with {type: "json"}
import path from "path";

const isDocker = process.env.BURGERPANEL_DOCKER == "1";

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
    files = files.filter(f => {
        if(fs.statSync("src/packets/" + f).isDirectory()) return false;
        return true;
    });
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


async function runESBuild() {
    await esbuild.build({
        entryPoints: ["dist/Server/src/index.js"],
        minify: true,
        bundle: true,
        platform: "node",
        format: "esm",
        target: "es2022",
        banner: {
            js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);import * as url from 'url';const __filename = url.fileURLToPath(import.meta.url);" // read comments in /src/clients.ts to see explanation for this
        },
        define: {
            "process.env.NODE_ENV": "\"production\"",
            "process.env.IS_DOCKER": isDocker ? "1" : "0"
        },
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
        console.log(`Could not delete ${args[0]}: ${err}. This is fine.`)
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
    fs.copyFileSync("../LICENSE", "_build/LICENSE.txt");
    fs.copyFileSync("../README.md", "_build/README.txt");
    if(!process.env.SKIP_WEB) fs.cpSync("../Web/dist/", "_build/Web", {recursive: true});
    fs.writeFileSync("_build/package.json", "{}");
}

async function serverSeries() {
    await buildServer();
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