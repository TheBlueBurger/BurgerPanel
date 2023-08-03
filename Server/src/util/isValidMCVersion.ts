let cachedManifest: unknown;
let manifestCachedAt = Date.now();
export async function getManifest() {
    if(Date.now() < (manifestCachedAt + 30*60*1000) && typeof cachedManifest != "undefined") return cachedManifest; // 30 mins cache
    let manifest = await (await fetch("https://launchermeta.mojang.com/mc/game/version_manifest.json")).json();
    if(!manifest?.versions) throw new Error("Mojang broke? manifest.versions doesnt exist");
    cachedManifest = manifest;
    manifestCachedAt = Date.now();
    return manifest;
}
export default async function isValidMCVersion(version: string): Promise<boolean> {
    let manifest = await getManifest();
    return manifest?.versions.some((v: any) => v.id == version);
}
