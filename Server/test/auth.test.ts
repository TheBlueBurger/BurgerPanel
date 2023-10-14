import {test,expect} from "vitest";
import TestUtil from "./testUtil";
await TestUtil.start();
test("it should fail on invalid username/pass", async () => {
    let client = await TestUtil.getClient();
    let resp = client.req("auth", {
        username: "among",
        password: "us"
    });
    expect(resp).rejects.toThrow();
});