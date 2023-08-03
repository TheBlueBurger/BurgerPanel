let rootAPI = "https://api.modrinth.com/v2";
import qs from "node:querystring";
import { buildInfo } from "../../../Share/BuildInfo.js";
import { Plugin, Version } from "../../../Share/Plugin.js";
export let mrHeaders = new Headers();
mrHeaders.append("User-Agent", `TheBlueBurger/BurgerPanel/v${buildInfo.version} (${buildInfo.gitHash})`);
// https://docs.modrinth.com/docs/tutorials/api_search/
async function sendModrinthRequest(path: string) {
    let res = await fetch(rootAPI + path, {
        headers: mrHeaders
    });
    let jsonData = await res.json();
    return jsonData;
}
export async function search(query: string, version: string) {
    let encodedQS = qs.encode({
        query,
        facets: JSON.stringify([
            ["versions:" + version],
            ["categories:paper"]
        ])
    })
    return await sendModrinthRequest("/search?" + encodedQS);
}
export async function getPluginDetails(slug: string): Promise<Plugin> {
    return await sendModrinthRequest("/project/"+slug);
}
export async function getVersions(slug: string, version: string): Promise<Version[]> {
    let encodedQS = qs.encode({
        loaders: JSON.stringify(["paper"]),
        game_versions: JSON.stringify([version])
    })
    return await sendModrinthRequest("/project/"+slug+"/version?" + encodedQS);
}

export async function getVersion(version: string): Promise<Version> {
    return await sendModrinthRequest("/version/"+version);
}
export async function getFile(version: string, sha512: string) {
    let ver = await getVersion(version);
    if(!ver) throw new Error("ver no exist");
    return ver.files.find(f => f.hashes.sha512 == sha512);
}