import {test,expect, describe,assert} from "vitest";
import TestUtil from "./testUtil";
import os from "node:os";
await TestUtil.start();
let client = await TestUtil.getClient(true);
describe("SysInfo", async () => {
    describe("General", () => {
        test("User list shall include current user", async() => {
            let sysInfo = await client.req("systemInformation", {});
            let i = TestUtil.getFullUser();
            expect(sysInfo.general.clients[0].username).eq(i.username);
            expect(sysInfo.general.clients[0].id).eq(i.id);
            expect(sysInfo.general.clients[0].token).toBeUndefined();
        });
    });
    describe("Performance", () => {
        test("Platform", async() => {
            let sysInfo = await client.req("systemInformation", {});
            expect(sysInfo.performance.platform).toEqual(process.platform);
        });
        test("Load", async() => {
            let sysInfo = await client.req("systemInformation", {});
            let load = sysInfo.performance.load;
            assert(Array.isArray(load));
            assert(load.length == 3);
        });
        test("Memory", async() => {
            let sysInfo = await client.req("systemInformation", {});
            let mem = sysInfo.performance.mem;
            expect(mem.total).toEqual(os.totalmem());
            expect(mem.free).toBeTypeOf("number");
            expect(mem.free).toBeGreaterThan(1);
        });
    });
});