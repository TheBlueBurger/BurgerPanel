import fs from "node:fs";
import path from "node:path";
import url from "node:url";
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export function searchRecursively(folder: string = __dirname) {
    let allFiles: string[] = [];
    let inCurrentFolder = fs.readdirSync(folder);
    for(let file of inCurrentFolder) {
        let statData = fs.statSync(path.join(folder, file));
        if(statData.isDirectory()) allFiles = [...allFiles, ...searchRecursively(path.join(folder, file)).map(f => `${file}/${f}`)];
        else allFiles.push(file);
    }
    return allFiles.filter(f => f.endsWith(".test.ts"));
}
export default function getPortByName(filename: string) {
    return searchRecursively().indexOf(filename) + 3000;
}