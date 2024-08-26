let rootAPI = "https://api.modrinth.com/v2";
import qs from "node:querystring";
import { buildInfo } from "../../../Share/BuildInfo.js";
import { Plugin, Version } from "../../../Share/Plugin.js";
import { AllowedSoftware } from "../../../Share/Server.js";
export let mrHeaders = new Headers();

let bukkitTypes = ["bukkit", "spigot", "paper"];

mrHeaders.append(
  "User-Agent",
  `TheBlueBurger/BurgerPanel/v${buildInfo.version} (${buildInfo.gitHash})`,
);
// https://docs.modrinth.com/docs/tutorials/api_search/
async function sendModrinthRequest(path: string) {
  let res = await fetch(rootAPI + path, {
    headers: mrHeaders,
  });
  let jsonData = await res.json();
  return jsonData;
}
export async function search(query: string, version: string, software: AllowedSoftware) {
  let encodedQS = qs.encode({
    query,
    facets: JSON.stringify([
      ["versions:" + version],
      ["server_side:required","server_side:optional"],
      software != "fabric" ? bukkitTypes.map((a) => "categories:" + a): ["categories:fabric"],
    ]),
  });
  return await sendModrinthRequest("/search?" + encodedQS);
}
export async function getPluginDetails(slug: string): Promise<Plugin> {
  return await sendModrinthRequest("/project/" + slug);
}
export async function getVersions(slug: string, version: string, software: AllowedSoftware): Promise<Version[]> {
  let encodedQS = qs.encode({
    loaders: software == "fabric" ? ["fabric"] : JSON.stringify(bukkitTypes),
    game_versions: JSON.stringify([version]),
  });
  return await sendModrinthRequest(
    "/project/" + slug + "/version?" + encodedQS,
  );
}

export async function getVersion(version: string): Promise<Version> {
  return await sendModrinthRequest("/version/" + version);
}
export async function getFile(version: string, sha512: string) {
  let ver = await getVersion(version);
  if (!ver) throw new Error("ver no exist");
  return ver.files.find((f) => f.hashes.sha512 == sha512);
}
