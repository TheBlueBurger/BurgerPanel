import nodeCrypto from "node:crypto";
export let makeToken = () => nodeCrypto.randomBytes(64).toString("base64url");