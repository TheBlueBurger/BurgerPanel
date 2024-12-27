import { describe, expect, test } from "vitest";
import testUtil from "../testUtil";
await testUtil.start();
let c = await testUtil.getClient(true);
describe("user", () => {
    describe("getUserData", () => {
        test("Should work", async () => {
            let expectedUserData = testUtil.getFullUser();
            let resp = await c.req("getUserData", {id: expectedUserData.id});
            expect(resp.user).toEqual({...expectedUserData, token: "", password: ""});
        });
    });
    test("Permission", async () => {
        let newC = await testUtil.getNewUserClient("userDataNoPermTest");
        let fullUserData = testUtil.getFullUser();
        let e = newC.req("getUserData", {id: fullUserData.id});
        expect(e).rejects.toThrow("You do not have permission to use this packet!");
    });
});
