import fs from "node:fs/promises";
export const exists = async (name: string) => await fs.stat(name).then(() => true).catch(() => false); // im proud of this one
