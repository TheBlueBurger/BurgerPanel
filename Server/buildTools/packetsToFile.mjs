import fs from "node:fs";
let files = fs.readdirSync("src/packets");
let textData = "// Do not touch this file, it is automatically changed.\nexport default [";
for(let [i, file] of files.entries()) {
    textData += `"${file.replace(".ts", "")}"${i == files.length-1 ? '' : ','}`
}
textData += "] as const;"
fs.writeFileSync("../Share/Packets.ts", textData);