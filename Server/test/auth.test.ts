import {test,expect,describe} from "vitest";
import TestUtil from "./testUtil";
await TestUtil.start();
describe("Security", () => {
    test("it should fail on invalid username and pass", async () => {
        let client = await TestUtil.getClient();
        let resp = client.req("auth", {
            username: "among",
            password: "us"
        });
        expect(resp).rejects.toThrow();
    });
    test("it should fail on empty username and and valid pass", async () => {
        let adminClient = await TestUtil.getClient(true);
        let fullUserInfo = TestUtil.getFullUser();
        await adminClient.req("editUser", {action: "changePassword", password: "helloworld", id: fullUserInfo.id});
        adminClient.close();
        let client = await TestUtil.getClient();
        let resp = client.req("auth", {
            username: "",
            password: "helloworld"
        });
        expect(resp).rejects.toThrow();
    });
    test("it should fail on valid username and and invalid pass", async () => {
        let client = await TestUtil.getClient();
        let fullUserInfo = TestUtil.getFullUser();
        let adminClient = await TestUtil.getClient(true);
        await adminClient.req("editUser", {action: "changePassword", password: "helloworld123", id: fullUserInfo.id});
        adminClient.close();
        let resp = client.req("auth", {
            username: fullUserInfo.username
        });
        let resp2 = client.req("auth", {
            username: fullUserInfo.username,
            password: ""
        });
        let resp3 = client.req("auth", {
            username: fullUserInfo.username,
            password: "some-password"
        });
        expect(resp).rejects.toThrow();
        expect(resp2).rejects.toThrow();
        expect(resp3).rejects.toThrow();
    });
    test("it should fail on invalid token", async () => {
        let client = await TestUtil.getClient();
        let resp = client.req("auth", {
            token: ""
        });
        expect(resp).rejects.toThrow();
        let resp2 = client.req("auth", {
            token: "geaeg"
        });
        expect(resp2).rejects.toThrow();
    });
});

describe("Works", () => {
    test("username/password", async() => {
        let fullUserInfo = TestUtil.getFullUser();
        let client = await TestUtil.getClient(true);
        await client.req("editUser", {id: fullUserInfo.id, action: "changePassword", password: "hellothere123"});
        await client.req("logout", {});
        let newFullUserInfo = TestUtil.getFullUser();
        const resp = await client.req("auth", {
            username: fullUserInfo.username,
            password: "hellothere123"
        });
        expect(resp).toEqual({
            servers: [],
            statuses: {},
            user: newFullUserInfo
        });
    });
    test("token", async() => {
        let fullUserInfo = TestUtil.getFullUser();
        let client = await TestUtil.getClient();
        let resp = await client.req("auth", {
            token: fullUserInfo.token
        });
        expect(resp).toEqual({
            servers: [],
            statuses: {},
            user: fullUserInfo
        });
    });
})