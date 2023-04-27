import nodeCrypto from "node:crypto";
export default function makeHash(text: string): string {
    let hash = nodeCrypto.createHash("sha512");
    hash.update(text);
    return hash.digest("base64");
}