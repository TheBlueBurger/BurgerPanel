import url from 'node:url';
import fs from "node:fs";
import path from 'node:path';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
try {
    fs.rmSync(path.join(__dirname, "..", "test-context"), {recursive: true});
} catch(err) {
    if(!err.toString().includes("ENOENT")) throw err;
}