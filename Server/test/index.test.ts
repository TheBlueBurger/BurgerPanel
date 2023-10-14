import {test} from "vitest";
import testUtil from "./testUtil";
await testUtil.start()
test("should be 200 OK", async () => {
    let res = await fetch("http://localhost:" + testUtil.port);
    if(!res.ok) throw new Error(`Not OK`);
});