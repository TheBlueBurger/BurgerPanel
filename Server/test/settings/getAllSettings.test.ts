import { describe, expect, test } from "vitest";
import testUtil from "../testUtil";
await testUtil.start();
let c = await testUtil.getClient(true);
describe("getAllSettings", () => {
    test("Should work", async () => {
        let resp = await c.req("getAllSettings", {});
        ["defaultMemory", "webServerPort", "stopServerTimeout", "bypassFileTypeLimitations"].forEach(s => {
            expect(resp[s]).toBeTypeOf("number");
        });
        ["serverPath", "defaultMCVersion", "defaultMCSoftware", "defaultPermissions", "logging_DiscordWebHookURL", "logging_DisabledIDs", "logging_logDir"].forEach(s => {
            expect(resp[s]).toBeTypeOf("string");
        });
    });
    test("Permission", async () => {
        let newC = await testUtil.getNewUserClient("getallsettingstest");
        let e = newC.req("getAllSettings", {});
        expect(e).rejects.toThrow("You do not have permission to use this packet!");
    })
})