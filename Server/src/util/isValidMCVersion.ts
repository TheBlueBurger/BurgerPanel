export default async function isValidMCVersion(version: string): Promise<boolean> {
    let manifest = await (await fetch("https://launchermeta.mojang.com/mc/game/version_manifest.json")).json();
    return manifest?.versions.some((v: any) => v.id == version);
}
