import fs from "node:fs";
let files = fs.readdirSync("src/packets");
let shareTextData = `// Do not touch this file, it is automatically changed.\nexport default ${JSON.stringify(files.map(f => f.replace(".ts", "")))} as const`;
fs.writeFileSync("../Share/Packets.ts", shareTextData);