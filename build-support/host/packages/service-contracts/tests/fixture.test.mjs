import test from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "../../../tests/service/support/fixture.mjs";

test("실제 서비스 harness가 없으면 성공 값을 만들지 않고 기능 부재를 알린다", async (t) => {
  // given
  const fixture = await createFixture(t);
  const request = fixture.request("connection.list");

  // when
  const actual = await fixture.call(request).catch((error) => error);

  // then
  assert.equal(actual.code, "CAPABILITY_UNAVAILABLE");
  assert.equal(fixture.driver.calls.length, 0);
});
